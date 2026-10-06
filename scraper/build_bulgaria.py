#!/usr/bin/env python3
"""Build the Bulgaria map + both config blocks (parliamentary + presidential).

Parliamentary: 240 seats in 28 provinces (the 31 MIRs merged: Sofia-city's
three and Plovdiv's two), Hare-quota largest remainder, 4% threshold.
Baselines: the 2021 per-constituency pattern (the only per-province table
on en.wikipedia) scaled to the 2026 national result, so the regional
structure survives (DPS/APS strong in Kardzhali and Razgrad etc).

Presidential: MAP_ONLY two-round model for the 25 October 2026 election
(runoff 1 November); the runoff map carries the 2021 runoff result
(Radev 66.7 / Gerdzhikov 33.3 -> Iotova / Gyurov).

Writes img/bulgaria.svg and patches the bg + bgpres blocks into js/config.js.

Usage: python scraper/build_bulgaria.py [--force]
"""

import json
import os
import re
import sys
import unicodedata

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
OUT_SVG = os.path.join(ROOT, "img", "bulgaria.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "bulgaria.svg")
GEOJSON = os.path.join(CACHE, "bg_provinces.geojson")
GEO_URL = ("https://www.geoboundaries.org/api/current/gbOpen/BGR/ADM1/")
ATTRIBUTION = ("Резултати: ЦИК (2021/2026, via en.wikipedia); "
               "Геометрия: geoBoundaries.org")

PARTIES = ["pb", "gerb", "pp", "db", "dps", "vaz", "mech", "veli", "bsp",
           "aps"]
# 2026 national result (19 April 2026)
NATIONAL = {"pb": 43.9, "gerb": 13.2, "pp": 5.5, "db": 6.9, "dps": 7.0,
            "vaz": 4.2, "mech": 3.2, "veli": 3.1, "bsp": 3.0, "aps": 1.5}
SEATS_2026 = {"pb": 131, "gerb": 39, "pp": 16, "db": 21, "dps": 21,
              "vaz": 12, "mech": 0, "veli": 0, "bsp": 0, "aps": 0}
# 2021 November national shares (the per-province pattern's anchor)
NAT2021 = {"pp": 25.67, "gerb": 22.74, "dps": 10.71, "bsp": 10.21,
           "itn": 9.52, "db": 6.37, "vaz": 4.86}
# province key -> seats (the 2024/2026 apportionment, 31 MIRs merged)
SEATS = {
    "blagoevgrad": 11, "burgas": 14, "varna": 15, "veliko_tarnovo": 8,
    "vidin": 4, "vratsa": 6, "gabrovo": 4, "dobrich": 6, "kardzhali": 5,
    "kyustendil": 4, "lovech": 5, "montana": 5, "pazardzhik": 9,
    "pernik": 4, "pleven": 9, "plovdiv": 22, "razgrad": 4, "ruse": 8,
    "silistra": 4, "sliven": 6, "smolyan": 4, "sofiacity": 42, "sofia": 8,
    "stara_zagora": 11, "targovishte": 4, "haskovo": 8, "shumen": 6,
    "yambol": 4,
}
SHAPE = {
    "Blagoevgrad": "blagoevgrad", "Burgas": "burgas", "Varna": "varna",
    "Veliko Tarnovo": "veliko_tarnovo", "Vidin": "vidin",
    "Vratsa": "vratsa", "Gabrovo": "gabrovo", "Dobrich": "dobrich",
    "Kardzhali": "kardzhali", "Kyustendil": "kyustendil",
    "Lovech": "lovech", "Montana": "montana", "Pazardzhik": "pazardzhik",
    "Pernik": "pernik", "Pleven": "pleven", "Plovdiv": "plovdiv",
    "Razgrad": "razgrad", "Ruse": "ruse", "Silistra": "silistra",
    "Sliven": "sliven", "Smolyan": "smolyan", "Sofia": "sofia",
    "Sofia City": "sofiacity", "Sofia (stolitsa)": "sofiacity",
    "Sofia-city": "sofiacity", "Stara Zagora": "stara_zagora",
    "Targovishte": "targovishte", "Haskovo": "haskovo",
    "Shumen": "shumen", "Yambol": "yambol",
}
# the 2021 table's constituency labels -> province keys
CONST21 = {
    "blagoevgrad": "blagoevgrad", "burgas": "burgas", "varna": "varna",
    "veliko tarnovo": "veliko_tarnovo", "vidin": "vidin",
    "vratsa": "vratsa", "gabrovo": "gabrovo", "dobrich": "dobrich",
    "kardzhali": "kardzhali", "kyustendil": "kyustendil",
    "lovech": "lovech", "montana": "montana", "pazardzhik": "pazardzhik",
    "pernik": "pernik", "pleven": "pleven", "plovdiv-city": "plovdiv",
    "plovdiv-province": "plovdiv", "razgrad": "razgrad", "ruse": "ruse",
    "silistra": "silistra", "sliven": "sliven", "smolyan": "smolyan",
    "sofia-city": "sofiacity", "sofia-province": "sofia",
    "stara zagora": "stara_zagora", "targovishte": "targovishte",
    "haskovo": "haskovo", "shumen": "shumen", "yambol": "yambol",
}


def norm(s):
    s = unicodedata.normalize("NFKD", s or "")
    s = s.encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z]", "", s.lower())


SHAPE_NORM = {norm(k): v for k, v in SHAPE.items()}
CONST_NORM = {norm(k): v for k, v in CONST21.items()}


def fetch(url, name, force=False, binary=False):
    path = os.path.join(CACHE, name)
    if force or not os.path.isfile(path):
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"},
                         timeout=300)
        r.raise_for_status()
        open(path, "wb").write(r.content)
    return open(path, "rb").read() if binary else \
        open(path, encoding="utf8").read()


def pct(s):
    m = re.match(r"(\d+(?:\.\d+)?)\s*%?", (s or "").strip())
    return float(m.group(1)) if m else None


def parse_2021(html):
    """2021 per-constituency shares -> province pattern (percent of 2021)."""
    soup = BeautifulSoup(html, "lxml")
    prov = {}
    for t in soup.find_all("table"):
        rows = t.find_all("tr")
        if len(rows) < 20:
            continue
        hdr = [" ".join(c.get_text(" ", strip=True).split())
               for c in rows[0].find_all(["td", "th"])]
        if not (hdr and hdr[0] == "Constituency"):
            continue
        keys = {}
        for i, h in enumerate(hdr[1:], start=1):
            low = h.lower()
            if "gerb" in low:
                keys[i] = "gerb"
            elif low == "pp":
                keys[i] = "pp"
            elif low == "db":
                keys[i] = "db"
            elif low == "dps":
                keys[i] = "dps"
            elif "bsp" in low:
                keys[i] = "bsp"
            elif "revival" in low:
                keys[i] = "vaz"
        if len(keys) < 4:
            continue
        for tr in rows[1:]:
            cells = [" ".join(c.get_text(" ", strip=True).split())
                     for c in tr.find_all(["td", "th"])]
            if len(cells) < 4:
                continue
            key = CONST_NORM.get(norm(cells[0]))
            if not key:
                continue
            shares = prov.setdefault(key, {})
            for i, pk in keys.items():
                v = pct(cells[i]) if i < len(cells) else None
                if v is not None:
                    shares.setdefault(pk, []).append(v)
        break
    out = {}
    for key, shares in prov.items():
        out[key] = {p: sum(v) / len(v) for p, v in shares.items()}
    return out


def main():
    force = "--force" in sys.argv
    os.makedirs(CACHE, exist_ok=True)

    gj = json.loads(fetch(GEO_URL, "bg_adm1_meta.json", force))
    geo = json.loads(fetch(gj["gjDownloadURL"], "bg_provinces.geojson",
                           force, binary=True))
    print("features:", len(geo["features"]))
    names = {}
    for f in geo["features"]:
        shape = f["properties"].get("shapeName", "")
        key = SHAPE_NORM.get(norm(shape))
        if not key:
            print("unmapped shape:", repr(shape))
            continue
        names[shape] = key
    assert len(set(names.values())) == 28, \
        f"expected 28 provinces, got {len(set(names.values()))}"

    pat21 = parse_2021(fetch("https://en.wikipedia.org/wiki/"
                             "2021_Bulgarian_presidential_election",
                             "bgpres2021_article.html", force))
    print("2021 pattern provinces:", len(pat21))

    gebiete = {}
    for key in SEATS:
        base = pat21.get(key, {})
        g = {}
        for p in PARTIES:
            if p == "pb":
                g[p] = NATIONAL["pb"]           # new party: flat
            elif p in ("mech", "veli"):
                g[p] = NATIONAL[p]
            elif p == "aps":
                g[p] = round(base.get("dps", NAT2021["dps"]) *
                             (NATIONAL["aps"] / NAT2021["dps"]), 2)
            else:
                src = base.get(p)
                if src is None:
                    g[p] = 0.0
                else:
                    g[p] = round(src * (NATIONAL[p] / NAT2021[p]), 2)
        gebiete[key] = g

    os.makedirs(os.path.join(ROOT, "data", "bg"), exist_ok=True)
    name_map_path = os.path.join(CACHE, "bg_name_map.json")
    with open(name_map_path, "w", encoding="utf8") as fh:
        json.dump(names, fh, ensure_ascii=False)
    sys.argv = ["build_map_svg.py", "--geojson", GEOJSON,
                "--name-field", "shapeName", "--fold", "--attr", "id",
                "--no-prefix", "--out", OUT_SVG, "--attribution", ATTRIBUTION,
                "--name-map", name_map_path]
    if force:
        sys.argv.append("--force")
    bm.main()
    os.makedirs(os.path.dirname(BMV_SVG), exist_ok=True)
    import shutil
    shutil.copy2(OUT_SVG, BMV_SVG)

    j = json.dumps
    keys = sorted(SEATS)
    text = open(os.path.join(ROOT, "js", "config.js"), encoding="utf8").read()

    bg = f"""  bg: {{
    name: 'Bulgaria',
    unitLabel: {{ en: 'provinces', tr: 'vilayet' }},
    seats: 240,
    threshold: 4.0,
    method: 'hare',
    seatBased: false,
    constituencies: false,
    recencyHalfLifeDays: 14,
    parties: {{
      pb:   {{ code: 'PB',   name: 'Progressive Bulgaria', name_en: 'Progressive Bulgaria', color: '#034A3F' }},
      gerb: {{ code: 'GERB', name: 'GERB–SDS', name_en: 'GERB–SDS', color: '#0054A6' }},
      pp:   {{ code: 'PP',   name: 'We Continue the Change', name_en: 'We Continue the Change', color: '#FFC300' }},
      db:   {{ code: 'DB',   name: 'Democratic Bulgaria', name_en: 'Democratic Bulgaria', color: '#004A80' }},
      dps:  {{ code: 'DPS',  name: 'Movement for Rights and Freedoms', name_en: 'Movement for Rights and Freedoms', color: '#0065B7' }},
      vaz:  {{ code: 'VAZ',  name: 'Vazrazhdane', name_en: 'Vazrazhdane', color: '#C09F62' }},
      mech: {{ code: 'MECH', name: 'MECH', name_en: 'Moral, Unity, Honour', color: '#1A2C44' }},
      veli: {{ code: 'VEL',  name: 'Velichie', name_en: 'Greatness', color: '#AC2225' }},
      bsp:  {{ code: 'BSP',  name: 'BSP – United Left', name_en: 'BSP – United Left', color: '#DB0F28' }},
      aps:  {{ code: 'APS',  name: 'Alliance for Rights and Freedoms', name_en: 'Alliance for Rights and Freedoms', color: '#C55AD3' }},
    }},
    order: ['pb', 'gerb', 'pp', 'db', 'dps', 'vaz', 'mech', 'veli', 'bsp', 'aps'],
    parlOrder: ['bsp', 'aps', 'dps', 'pp', 'db', 'pb', 'mech', 'vaz', 'gerb', 'veli'],
    blocs: {{
      bloc1: {{ name: 'Government', short: 'GOV', parties: ['pb'], color: '#034A3F' }},
      bloc2: {{ name: 'Opposition', short: 'OPP', parties: ['gerb', 'pp', 'db', 'dps', 'vaz', 'mech', 'veli', 'bsp', 'aps'], color: '#0054A6' }},
    }},
    lastElection: {{
      date: '2026-04-19',
      results: {j(NATIONAL, ensure_ascii=False)},
      seats: {j(SEATS_2026, ensure_ascii=False)},
    }},
    map: {{
      svg: 'img/bulgaria.svg',
      selector: 'id',
      swingMethod: 'geometric',
      districtThreshold: true,
      districts: {j({k: k for k in keys}, ensure_ascii=False)},
      seatDistricts: {j({k: SEATS[k] for k in keys}, ensure_ascii=False)},
      gebiete: {j(gebiete, ensure_ascii=False)},
      national2021: {j(NATIONAL, ensure_ascii=False)},
    }},
    pollsterMAE: {{}},
    maeKey: 'BG2026',
    logos: {{
      pb: 'img/bg/PB.svg', gerb: 'img/bg/GERB.svg', pp: 'img/bg/PP.svg',
      db: 'img/bg/DB.svg', dps: 'img/bg/DPS.svg', vaz: 'img/bg/VAZ.svg',
      mech: 'img/bg/MECH.svg', veli: 'img/bg/VELI.svg',
      bsp: 'img/bg/BSP.svg', aps: 'img/bg/APS.svg',
    }},
  }},
"""
    # presidential first-round baselines per province: each candidate's
    # supporting bloc from the parliamentary pattern, scaled to the current
    # poll level (the pattern keeps the geography: Kardzhali/Razgrad lean
    # DPS, the west leans GERB)
    CAND_BLOC = {"iotova": ["pb", "bsp"], "gyurov": ["pp", "db"],
                 "kostadinov": ["vaz"], "vasilev": ["mech"],
                 "mihaylov": ["veli"]}
    PRES_NAT = {"iotova": 46.9, "gyurov": 25.3, "kostadinov": 9.7,
                "vasilev": 4.6, "mihaylov": 2.4, "hristanov": 1.9}
    pres_gebiete, pres_runoff = {}, {}
    for key in keys:
        g = gebiete[key]
        row = {}
        for cand, bloc in CAND_BLOC.items():
            bsum = sum(g.get(x, 0) for x in bloc)
            nsum = sum(NATIONAL.get(x, 0) for x in bloc)
            row[cand] = round(bsum * (PRES_NAT[cand] / nsum), 2) if nsum else 0.0
        row["hristanov"] = PRES_NAT["hristanov"]
        pres_gebiete[key] = row
        a, b = row["iotova"], row["gyurov"]
        tot = a + b
        pres_runoff[key] = {
            "iotova": round(a * 100 / tot, 2) if tot else 50.0,
            "gyurov": round(b * 100 / tot, 2) if tot else 50.0,
        }
    PRES = PRES_NAT
    bgpres = f"""  bgpres: {{
    name: 'Bulgaria (presidential)',
    unitLabel: {{ en: 'provinces', tr: 'vilayet' }},
    seats: 1,
    threshold: 0,
    seatBased: false,
    mapOnly: true,
    hideBlocs: true,
    recencyHalfLifeDays: 14,
    election_date: '2026-10-25',
    election_date_runoff: '2026-11-01',
    parties: {{
      iotova:     {{ code: 'IOTOVA', name: 'Iliana Iotova', name_en: 'Iliana Iotova', color: '#034A3F' }},
      gyurov:     {{ code: 'GYUROV', name: 'Andrey Gyurov', name_en: 'Andrey Gyurov', color: '#4200FF' }},
      kostadinov: {{ code: 'KOST.', name: 'Kostadin Kostadinov', name_en: 'Kostadin Kostadinov', color: '#C09F62' }},
      vasilev:    {{ code: 'VASILEV', name: 'Radostin Vasilev', name_en: 'Radostin Vasilev', color: '#1A2C44' }},
      mihaylov:   {{ code: 'MIHAYLOV', name: 'Ivelin Mihaylov', name_en: 'Ivelin Mihaylov', color: '#AC2225' }},
      hristanov:  {{ code: 'HRIST.', name: 'Ivan Hristanov', name_en: 'Ivan Hristanov', color: '#D6C3A1' }},
    }},
    order: ['iotova', 'gyurov', 'kostadinov', 'vasilev', 'mihaylov', 'hristanov'],
    parlOrder: ['hristanov', 'vasilev', 'gyurov', 'iotova', 'mihaylov', 'kostadinov'],
    blocs: {{
      bloc1: {{ name: 'Iotova', short: 'IOT', parties: ['iotova'], color: '#034A3F' }},
      bloc2: {{ name: 'Gyurov', short: 'GYU', parties: ['gyurov'], color: '#4200FF' }},
    }},
    lastElection: {{
      date: '2021-11-21',
      results: {{ iotova: 49.42, gyurov: 22.83, kostadinov: 3.68, vasilev: 0, mihaylov: 0, hristanov: 0 }},
      seats: {{ iotova: 1, gyurov: 0, kostadinov: 0, vasilev: 0, mihaylov: 0, hristanov: 0 }},
    }},
    map: {{
      svg: 'img/bulgaria.svg',
      selector: 'id',
      districts: {j({k: k for k in keys}, ensure_ascii=False)},
      gebiete: {j(pres_gebiete, ensure_ascii=False)},
      national2021: {j(PRES_NAT, ensure_ascii=False)},
      // the runoff baseline per province: the two-way ratio of the derived
      // first-round baselines (2021's Radev/Gerdzhikov map is not available
      // per province, so the parliamentary pattern stands in)
      runoff2022: {j(pres_runoff, ensure_ascii=False)},
      // current head-to-head estimate (first-round 47 vs 25 transfers)
      nationalRunoff: {{ iotova: 62, gyurov: 38 }},
    }},
    pollsterMAE: {{}},
    maeKey: 'BGPRES2026',
    logos: {{
      iotova: 'img/bg/PB.svg', gyurov: 'img/bg/PPDB.svg',
      kostadinov: 'img/bg/VAZ.svg', vasilev: 'img/bg/MECH.svg',
      mihaylov: 'img/bg/VELI.svg', hristanov: 'img/bg/Edinenie.svg',
    }},
  }},
"""
    for name, block in (("bgpres", bgpres), ("bg", bg)):
        m = re.search(r"\n  %s: \{" % name, text)
        if m:
            depth, k = 0, m.end() - 1
            while k < len(text):
                if text[k] == "{":
                    depth += 1
                elif text[k] == "}":
                    depth -= 1
                    if depth == 0:
                        break
                k += 1
            end = k + 1
            if text[end:end + 1] == ",":
                end += 1
            text = text[:m.start()] + "\n" + block.rstrip("\n") + text[end:]
        else:
            anchor = "\n  pt: {"
            text = text.replace(anchor, "\n" + block + anchor, 1)
    open(os.path.join(ROOT, "js", "config.js"), "w",
         encoding="utf8", newline="").write(text)
    print("patched config.js (bg + bgpres blocks)")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Build the Romania map (42 counties + Bucharest) + the ro config block.

Chamber of Deputies: 331 seats = 312 elected in the 43 constituencies
(41 counties + Bucharest + 4 diaspora deputies) + 19 reserved minority
deputies. Per-constituency Hare/Niemeyer with a national 5% threshold
(validated: on the 2020 per-county pattern scaled to the 2024 national
shares the method lands within one seat of the actual PSD 86 / AUR 63 /
USR 40 / UDMR 22; the real allocation is the two-stage Hare-quota +
national-D'Hondt described on en.wikipedia, but its integer-only first
stage collapses the party totals, so the per-constituency largest-remainder
form is used).

Baselines: the 2020 per-county result (ro.wikipedia, the only per-county
table) scaled to the 2024 national shares per party, so the regional
structure survives (PSD in the south, PNL in the centre/north, USR in the
cities and the diaspora, UDMR in the Szekely counties). Parties that did
not exist in 2020 inherit a proxy's geography (SOS/POT from AUR, FD from
PNL, REPER from USR); SENS is flat.

Writes img/romania.svg and inserts the ro block into js/config.js.

Usage: python scraper/build_romania.py [--force]
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
OUT_SVG = os.path.join(ROOT, "img", "romania.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "romania.svg")
GEOJSON = os.path.join(CACHE, "ro_counties.geojson")
GEO_URL = "https://www.geoboundaries.org/api/current/gbOpen/ROU/ADM1/"
PATTERN_ARTICLE = os.path.join(CACHE, "ro2020_article.html")
PATTERN_URL = ("https://ro.wikipedia.org/wiki/"
               "Alegeri_parlamentare_%C3%AEn_Rom%C3%A2nia,_2020")
RESULTS_ARTICLE = os.path.join(CACHE, "ro2024_article.html")
RESULTS_URL = ("https://en.wikipedia.org/wiki/"
               "2024_Romanian_parliamentary_election")
ATTRIBUTION = ("Rezultate: BEC (2020/2024, via Wikipedia); "
               "Geometrie: geoBoundaries.org")

# 2024 apportionment (Chamber deputies per constituency, 312 incl. diaspora)
SEATS = {
    "Bucure\u0219ti": 29, "Prahova": 12, "Ia\u0219i": 11,
    "Constan\u021ba": 11, "Bac\u0103u": 10, "Cluj": 10, "Dolj": 10,
    "Suceava": 10, "Timi\u0219": 10, "Arge\u0219": 9, "Bihor": 9,
    "Bra\u0219ov": 9, "Gala\u021bi": 9, "Mure\u0219": 8, "Neam\u021b": 8,
    "Arad": 7, "Buz\u0103u": 7, "D\u00e2mbovi\u021ba": 7,
    "Maramure\u0219": 7, "Vaslui": 7, "Boto\u0219ani": 6,
    "Hunedoara": 6, "Sibiu": 6, "Olt": 6, "V\u00e2lcea": 6, "Alba": 5,
    "Bistri\u021ba-N\u0103s\u0103ud": 5, "Br\u0103ila": 5,
    "Cara\u0219-Severin": 5, "Gorj": 5, "Harghita": 5, "Ilfov": 5,
    "Satu Mare": 5, "Teleorman": 5, "Vrancea": 5,
    "C\u0103l\u0103ra\u0219i": 4, "Covasna": 4, "Giurgiu": 4,
    "Ialomi\u021ba": 4, "Mehedin\u021bi": 4, "S\u0103laj": 4,
    "Tulcea": 4, "Diaspora": 4,
}
# 2020 per-county pattern columns
PAT20 = ["psd", "pnl", "usr", "aur", "udmr", "pmp", "pro"]
# 2020 national (Chamber) shares: the scaling anchor
NAT20 = {"psd": 28.90, "pnl": 25.19, "usr": 15.37, "aur": 9.08,
         "udmr": 5.74, "pmp": 4.82, "pro": 4.09}
# 2024 national (Chamber) shares and seats (official)
NAT24 = {"psd": 21.96, "aur": 18.01, "pnl": 13.20, "usr": 12.40,
         "sos": 7.36, "pot": 6.46, "udmr": 6.33, "pmp": 2.05,
         "fd": 1.88, "reper": 1.37, "sens": 2.99}
SEATS24 = {"psd": 86, "aur": 63, "pnl": 49, "usr": 40, "sos": 28,
           "pot": 24, "udmr": 22}
# party -> (pattern column, national anchor) for the per-county scaling
PROXY = {
    "psd": ("psd", "psd"), "aur": ("aur", "aur"), "pnl": ("pnl", "pnl"),
    "usr": ("usr", "usr"), "udmr": ("udmr", "udmr"), "pmp": ("pmp", "pmp"),
    "sos": ("aur", "aur"), "pot": ("aur", "aur"), "fd": ("pnl", "pnl"),
    "reper": ("usr", "usr"),
}
ORDER = ["psd", "aur", "pnl", "usr", "sos", "pot", "udmr", "pmp", "fd",
         "reper", "sens"]


def norm(s):
    s = unicodedata.normalize("NFKD", s or "")
    s = s.encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z]", "", s.lower())


def fetch(url, name, force=False):
    path = os.path.join(CACHE, name)
    if force or not os.path.isfile(path):
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"},
                         timeout=300)
        r.raise_for_status()
        open(path, "wb").write(r.content)
    return open(path, encoding="utf8").read()


def load_geo(force=False):
    if force or not os.path.isfile(GEOJSON):
        api = json.loads(fetch(GEO_URL, "ro_geo_api.json", force))
        dl = api.get("gjDownloadURL") or api.get("simplifiedGeometryGeoJSON")
        r = requests.get(dl, headers={"User-Agent": "Mozilla/5.0"},
                         timeout=300)
        r.raise_for_status()
        open(GEOJSON, "wb").write(r.content)
    return json.loads(open(GEOJSON, encoding="utf8").read())


def parse_pattern(html):
    soup = BeautifulSoup(html, "lxml")
    out = {}
    for t in soup.find_all("table"):
        rows = t.find_all("tr")
        if not rows:
            continue
        hdr = " ".join(rows[0].get_text(" ", strip=True).split())
        if not hdr.startswith("Jude\u021b") or "USR" not in hdr:
            continue
        for tr in rows[1:]:
            cells = [" ".join(c.get_text(" ", strip=True).split())
                     for c in tr.find_all(["td", "th"])]
            if len(cells) < 8:
                continue
            vals = []
            for c in cells[1:8]:
                m = re.match(r"(\d+(?:[.,]\d+)?)\s*%", c)
                vals.append(float(m.group(1).replace(",", ".")) if m else 0.0)
            out[cells[0]] = dict(zip(PAT20, vals))
        break
    return out


def main():
    force = "--force" in sys.argv
    geo = load_geo(force)

    pattern = parse_pattern(fetch(PATTERN_URL, "ro2020_article.html", force))
    print("pattern rows:", len(pattern))
    assert len(pattern) == 43, "expected 43 pattern rows"

    # shapeName -> county key (via the ASCII-folded pattern labels)
    pat_norm = {norm(k): k for k in pattern}
    names, missing = {}, []
    for f in geo["features"]:
        shape = f["properties"].get("shapeName") or ""
        key = pat_norm.get(norm(shape))
        if key:
            names[shape] = key
        else:
            missing.append(shape)
    assert not missing, f"unmapped shapes: {missing}"
    assert len(names) == 42, f"expected 42 counties, got {len(names)}"

    def baseline(key):
        base = pattern[key]
        g = {}
        for p in ORDER:
            if p == "sens":
                g[p] = NAT24["sens"]          # new party: flat
                continue
            col, anchor = PROXY[p]
            src = base.get(col, 0.0)
            g[p] = round(src * NAT24[p] / NAT20[anchor], 2) if NAT20[anchor] \
                else 0.0
        return g

    keys = sorted(names.values())
    gebiete = {key: baseline(key) for key in keys}
    # the diaspora constituency has no map shape but elects 4 deputies
    gebiete["Diaspora"] = baseline("Diaspora")

    name_map_path = os.path.join(CACHE, "ro_name_map.json")
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
    results = dict(NAT24)
    results["min"] = 0
    seats = dict(SEATS24)
    seats["min"] = 19
    for p in ORDER:
        results.setdefault(p, 0)
        seats.setdefault(p, 0)

    block = f"""  ro: {{
    name: 'Romania',
    seats: 331,
    threshold: 5.0,               // parties; 8/9/10% for alliances
    method: 'hare_niemeyer',      // per-constituency Hare/Niemeyer
    seatBased: false,
    constituencies: false,
    recencyHalfLifeDays: 21,      // pollsters publish monthly
    defaultDays: 90,
    // the 19 deputies of the recognised national minorities are reserved
    // (they are not in the polling tables and always hold their seats)
    reservedSeats: {{ min: 19 }},
    parties: {{
      psd:   {{ code: 'PSD',   name: 'Partidul Social Democrat', name_en: 'Social Democratic Party', color: '#EF3340' }},
      aur:   {{ code: 'AUR',   name: 'Alian\\u021ba pentru Unirea Rom\\u00e2nilor', name_en: 'Alliance for the Union of Romanians', color: '#FCB21F' }},
      pnl:   {{ code: 'PNL',   name: 'Partidul Na\\u021bional Liberal', name_en: 'National Liberal Party', color: '#FDE000' }},
      usr:   {{ code: 'USR',   name: 'Uniunea Salva\\u021bi Rom\\u00e2nia', name_en: 'Save Romania Union', color: '#002A59' }},
      sos:   {{ code: 'SOS',   name: 'S.O.S. Rom\\u00e2nia', name_en: 'S.O.S. Romania', color: '#4DA9DA' }},
      pot:   {{ code: 'POT',   name: 'Partidul Oamenilor Tineri', name_en: 'Party of Young People', color: '#330099' }},
      udmr:  {{ code: 'UDMR',  name: 'Uniunea Democrat\\u0103 Maghiar\\u0103 din Rom\\u00e2nia', name_en: 'Democratic Union of Hungarians in Romania', color: '#00833E' }},
      pmp:   {{ code: 'PMP',   name: 'Partidul Mi\\u0219carea Popular\\u0103', name_en: "People's Movement Party", color: '#A7CF35' }},
      fd:    {{ code: 'FD',    name: 'For\\u021ba Dreptei', name_en: 'Force of the Right', color: '#08510A' }},
      reper: {{ code: 'REPER', name: 'Re\\u00eennoim Proiectul European al Rom\\u00e2niei', name_en: "Renewing Romania's European Project", color: '#C40075' }},
      sens:  {{ code: 'SENS',  name: 'Partidul S\\u0103n\\u0103tate, Educa\\u021bie, Natur\\u0103, Sustenabilitate', name_en: 'Health Education Nature Sustainability Party', color: '#A2DA5A' }},
      min:   {{ code: 'MIN',   name: 'Minorit\\u0103\\u021bi na\\u021bionale', name_en: 'National minorities', color: '#9CA3AF', pastOnly: true }},
    }},
    order: ['psd', 'aur', 'pnl', 'usr', 'sos', 'pot', 'udmr', 'pmp', 'fd', 'reper', 'sens', 'min'],
    parlOrder: ['psd', 'min', 'udmr', 'pnl', 'reper', 'sens', 'usr', 'fd', 'pmp', 'aur', 'sos', 'pot'],
    // Government (the current PNL+USR+UDMR cabinet with the minorities)
    // vs Opposition (the forecast's majority simulation needs two blocs)
    blocs: {{
      bloc1: {{ name: 'Government', short: 'GOV', parties: ['pnl', 'usr', 'udmr', 'min'], color: '#FDE000' }},
      bloc2: {{ name: 'Opposition', short: 'OPP', parties: ['psd', 'aur', 'sos', 'pot', 'pmp', 'fd', 'reper', 'sens'], color: '#FCB21F' }},
    }},
    lastElection: {{
      date: '2024-12-01',
      // 19 minority deputies are reserved outside the party allocation
      results: {j(results, ensure_ascii=False)},
      seats: {j(seats, ensure_ascii=False)},
    }},
    map: {{
      svg: 'img/romania.svg',
      selector: 'id',
      swingMethod: 'geometric',
      // the 5% threshold is national, not per county
      districtThreshold: false,
      districts: {j(dict({k: k for k in keys}, Diaspora="Diaspora"), ensure_ascii=False)},
      seatDistricts: {j(dict({k: SEATS[k] for k in keys}, Diaspora=SEATS["Diaspora"]), ensure_ascii=False)},
      gebiete: {j(gebiete, ensure_ascii=False)},
      national2021: {j(NAT24, ensure_ascii=False)},
    }},
    pollsterMAE: {{}},
    maeKey: 'RO2028',
    logos: {{
      psd: 'img/ro/PSD.svg', aur: 'img/ro/AUR.svg', pnl: 'img/ro/PNL.svg',
      usr: 'img/ro/USR.svg', sos: 'img/ro/SOS.svg', pot: 'img/ro/POT.svg',
      udmr: 'img/ro/UDMR.svg', pmp: 'img/ro/PMP.svg', fd: 'img/ro/FD.svg',
      reper: 'img/ro/REPER.svg', sens: 'img/ro/SENS.svg',
    }},
  }},
"""
    text = open(os.path.join(ROOT, "js", "config.js"), encoding="utf8").read()
    assert "\n  ro: {" not in text, "ro block already present"
    anchor = "\n  pt: {"
    assert anchor in text
    text = text.replace(anchor, "\n" + block.rstrip("\n") + anchor, 1)
    open(os.path.join(ROOT, "js", "config.js"), "w",
         encoding="utf8").write(text)
    print("inserted ro block before pt")


if __name__ == "__main__":
    main()

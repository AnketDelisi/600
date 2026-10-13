#!/usr/bin/env python3
"""Build the Turkey map + config block (600 seats, per-province D'Hondt).

Baselines: the 2023 general election per-province results (tr.wikipedia
"2023 Türkiye genel seçimleri", the results-by-province table: seats,
valid votes and each party's votes/%/MV - AKP/CHP/MHP/IYI/YSP/Other).
Geometry: GADM 4.1 TUR ADM1 (81 provinces). The 600 seats are allocated
per province (D'Hondt, prDistricts) with the 7% national threshold; the
map shows the per-province winner.

Writes img/turkey.svg and inserts the turkey block into js/config.js.

Usage: python scraper/build_turkey.py [--force]
"""
import json
import os
import re
import sys

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
OUT_SVG = os.path.join(ROOT, "img", "turkey.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "turkey.svg")
GEOJSON = os.path.join(CACHE, "tr_provinces.geojson")
ARTICLE = "https://tr.wikipedia.org/wiki/2023_T%C3%BCrkiye_genel_se%C3%A7imleri"
ATTRIBUTION = ("Sonuçlar: YSK (2023 genel seçimi, tr.wikipedia); "
               "Geometri: GADM 4.1")
# GADM spells three provinces differently (two are typos) + the short
# Afyon name
ALIAS = {"K.Maras": "Kahramanmaraş", "Kinkkale": "Kırıkkale",
         "Zinguldak": "Zonguldak", "Afyon": "Afyonkarahisar"}

PARTIES = ["akp", "chp", "mhp", "iyi", "dem", "yrp", "zp", "tip", "a",
           "yep", "saadet", "bbp"]
# the 2023 table's columns -> config keys (YSP is the DEM vehicle; the
# remaining parties have no 2023 geography and swing uniformly)
COLS = {"AKP": "akp", "CHP": "chp", "MHP": "mhp", "İYİ": "iyi",
        "YSP": "dem", "Diğer": "other"}
META = {
    "akp": ("AKP", "Adalet ve Kalkınma Partisi", "#FF8700",
            "Conservatism, Right-wing populism"),
    "chp": ("CHP", "Cumhuriyet Halk Partisi", "#E30613",
            "Social democracy, Kemalism"),
    "mhp": ("MHP", "Milliyetçi Hareket Partisi", "#870000",
            "Ultranationalism, Turkish nationalism"),
    "iyi": ("İYİ", "İYİ Parti", "#40B4E5",
            "Nationalism, Liberal conservatism"),
    "dem": ("DEM", "Halkların Eşitlik ve Demokrasi Partisi", "#91007b",
            "Kurdish nationalism, Democratic socialism"),
    "yrp": ("YRP", "Yeniden Refah Partisi", "#ED1D24",
            "Islamism, National conservatism"),
    "zp": ("ZP", "Zafer Partisi", "#404040",
           "Turkish nationalism, Anti-immigration"),
    "tip": ("TİP", "Türkiye İşçi Partisi", "#b20309",
            "Communism, Socialism"),
    "a": ("A", "Anahtar Parti", "#072654",
          "Turkish nationalism, Conservatism"),
    "yep": ("YEP", "Yeni Parti", "#ED1C24",
            "Social democracy, Kemalism"),
    "saadet": ("SAADET", "Saadet Partisi", "#CF3338",
               "Islamism, National conservatism"),
    "bbp": ("BBP", "Büyük Birlik Partisi", "#ED1C24",
            "Turkish nationalism, Islamism"),
}
LOGOS = {"akp": "AKP.svg", "chp": "CHP.svg", "mhp": "MHP.svg",
         "iyi": "IYI.svg", "dem": "DEM.svg", "yrp": "YRP.svg",
         "zp": "ZAFER.svg", "tip": "TIP.svg", "a": "A.svg",
         "yep": "YENI.svg", "saadet": "SAADET.svg", "bbp": "BBP.svg"}
# 2023 national shares (YSK; the five table parties from the results-by-
# province total row, the rest from the nationwide results table)
NAT = {"akp": 35.62, "chp": 25.35, "mhp": 10.07, "iyi": 9.69, "dem": 8.82,
       "yrp": 2.80, "zp": 2.23, "tip": 1.76, "bbp": 0.97, "a": 0, "yep": 0,
       "saadet": 0}
SEATS23 = {"akp": 268, "chp": 169, "mhp": 50, "iyi": 43, "dem": 61,
           "yrp": 5, "tip": 4, "bbp": 0, "zp": 0, "a": 0, "yep": 0,
           "saadet": 0}


def fold(s):
    return bm.fold(s or "")


def num(s):
    s = re.sub(r"\[[^\]]*\]", "", s or "")
    return int(re.sub(r"[^\d]", "", s) or 0)


def dec(s):
    m = re.search(r"(\d+(?:,\d+)?)", (s or "").replace(".", ""))
    return float(m.group(1).replace(",", ".")) if m else 0.0


def fetch_geo(force=False):
    if force or not os.path.isfile(GEOJSON):
        r = requests.get("https://geodata.ucdavis.edu/gadm/gadm4.1/json/"
                         "gadm41_TUR_1.json",
                         headers={"User-Agent": "Mozilla/5.0"}, timeout=300)
        r.raise_for_status()
        open(GEOJSON, "w", encoding="utf8").write(r.text)
    gj = json.loads(open(GEOJSON, encoding="utf8").read())
    for f in gj["features"]:
        nm = f["properties"]["NAME_1"]
        f["properties"]["NAME_1"] = ALIAS.get(nm, nm)
    return gj


def expand_grid(table):
    rows = table.find_all("tr")
    grid, live = [], {}
    for tr in rows:
        cells = tr.find_all(["td", "th"])
        out, col, i = [], 0, 0
        while i < len(cells):
            while col in live and live[col][0] > 0:
                out.append(live[col][1])
                live[col] = (live[col][0] - 1, live[col][1])
                col += 1
            c = cells[i]
            txt = " ".join(c.get_text(" ", strip=True).split())
            cs = int(c.get("colspan") or 1)
            rs = int(c.get("rowspan") or 1)
            for k in range(cs):
                out.append(txt)
                if rs > 1:
                    live[col + k] = (rs - 1, txt)
            col += cs
            i += 1
        while col in live and live[col][0] > 0:
            out.append(live[col][1])
            live[col] = (live[col][0] - 1, live[col][1])
            col += 1
        grid.append(out)
    return grid


def parse_2023():
    r = requests.get(ARTICLE, headers={"User-Agent": "Mozilla/5.0"},
                     timeout=300)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "lxml")
    for tb in soup.find_all("table"):
        rows = tb.find_all("tr")
        if len(rows) < 80:
            continue
        grid = expand_grid(tb)
        hdr = grid[0] if grid else []
        if not hdr or "Seçim çevresi" not in " ".join(hdr[:2]):
            continue
        # columns: 0 name, 1 seats, 2 valid, then per party votes/%/MV
        colmap = {}
        for i, h in enumerate(hdr):
            h = h.strip()
            if h in COLS and i not in colmap:
                colmap[i] = COLS[h]
        out, nat = {}, None
        for row in grid[1:]:
            if len(row) < 21:
                continue
            name = row[0].replace(" (toplam)", "").strip()
            if name == "Türkiye toplamı":
                nat = {"seats": num(row[1]), "valid": num(row[2]),
                       "shares": {}, "votes": {}}
                for i, key in colmap.items():
                    nat["shares"][key] = dec(row[i + 1])
                    nat["votes"][key] = num(row[i])
                continue
            if re.search(r"\((?:I|II|III)\)$", row[0]) or not name:
                continue
            rec = {"name": name, "seats": num(row[1]), "valid": num(row[2]),
                   "shares": {}, "mv": {}}
            for i, key in colmap.items():
                rec["shares"][key] = dec(row[i + 1])
                rec["mv"][key] = num(row[i + 2])
            out[fold(name)] = rec
        if len(out) >= 80 and nat:
            return out, nat
    raise SystemExit("2023 results-by-province table not found")


def main():
    force = "--force" in sys.argv
    gj = fetch_geo(force)
    feats = gj["features"]
    print("provinces:", len(feats))
    assert len(feats) == 81

    res, nat = parse_2023()
    print("table rows:", len(res))
    missing = [f["properties"]["NAME_1"] for f in feats
               if fold(f["properties"]["NAME_1"]) not in res]
    print("geometries without results:", missing)
    assert not missing, "name mismatch"
    extra = [k for k in res
             if k not in {fold(f["properties"]["NAME_1"]) for f in feats}]
    print("results without geometry:", extra)

    print("2023 national (table):", nat["shares"], "seats", nat["seats"])
    wins = {}
    cons = []
    for f in feats:
        nm = f["properties"]["NAME_1"]
        r = res[fold(nm)]
        pid = fold(nm)
        top = max(r["shares"], key=r["shares"].get)
        wins[top] = wins.get(top, 0) + 1
        cons.append({"id": pid, "name": nm, "seats": r["seats"],
                     "shares": r["shares"], "mv": r["mv"], "winner": top})
    print("2023 winner counts (per province):", wins)
    tot = sum(c["seats"] for c in cons)
    print("total seats:", tot)
    assert tot == 600, "province seats must sum to 600"

    # the map geojson (names normalized)
    geo_norm = os.path.join(CACHE, "tr_provinces_norm.geojson")
    with open(geo_norm, "w", encoding="utf8") as fh:
        json.dump(gj, fh)
    sys.argv = ["build_map_svg.py", "--geojson", geo_norm,
                "--name-field", "NAME_1", "--fold", "--attr", "id",
                "--no-prefix", "--out", OUT_SVG,
                "--attribution", ATTRIBUTION]
    if force:
        sys.argv.append("--force")
    bm.main()
    import shutil
    shutil.copy2(OUT_SVG, BMV_SVG)

    # logos
    dst = os.path.join(ROOT, "img", "tr")
    os.makedirs(dst, exist_ok=True)
    logos = {}
    for key, logo in LOGOS.items():
        shutil.copy2(os.path.join(r"C:\Users\deneme\Desktop\600logo\TR",
                                  logo), os.path.join(dst, logo))
        logos[key] = "img/tr/" + logo

    j = json.dumps
    parties = "\n".join(
        "      %s: { code: '%s', name: '%s', name_en: '%s', color: '%s', "
        "ideology: \"%s\"}," % (k, META[k][0], META[k][1], META[k][1],
                                META[k][2], META[k][3])
        for k in PARTIES)
    block = """  turkey: {
    name: 'Turkey',
    name_tr: 'T\\u00fcrkiye',
    seats: 600,
    threshold: 7.0,               // 7%% national threshold (2022 change)
    method: 'dhondt',             // D'Hondt per province (prDistricts)
    seatBased: false,             // polls report vote shares (%%)
    constituencies: false,        // the 600 seats are allocated per province
    recencyHalfLifeDays: 7,
    parties: {
%s
    },
    order: ['akp', 'chp', 'mhp', 'iyi', 'dem', 'yrp', 'zp', 'tip', 'a', 'yep', 'saadet', 'bbp'],
    parlOrder: ['yep', 'tip', 'dem', 'chp', 'saadet', 'a', 'iyi', 'bbp', 'zp', 'akp', 'mhp', 'yrp'],
    blocs: {
      bloc1: { name: 'Government camp', short: 'GOV', parties: ['akp', 'mhp', 'yrp', 'bbp'], color: '#FF8700' },
      bloc2: { name: 'Opposition',      short: 'OPP', parties: ['chp', 'iyi', 'dem', 'zp', 'tip', 'a', 'yep', 'saadet'], color: '#E30613' },
    },
    logos: {
%s
    },
    pollsterMAE: {},
    maeKey: 'TR2028',
    lastElection: {
      date: '2023-05-14',
      // 2023 general election (YSK); YSP is the DEM vehicle, YRP/TIP
      // ran inside the Cumhur/Emek lists (their seats split out here)
      results: %s,
      seats: %s,
    },
    map: {
      svg: 'img/turkey.svg',
      selector: 'id',
      swingMethod: 'proportional',
      // 81 provinces: each province's seats are allocated by D'Hondt from
      // its 2023 shares + the national swing (prDistricts); the map colors
      // the per-province winner
      districts: %s,
      gebiete: %s,
      national2021: %s,
      prDistricts: %s,
    },
  },
""" % (parties,
       ', '.join("%s: '%s'" % (k, v) for k, v in logos.items()),
       j(NAT, ensure_ascii=False),
       j(SEATS23, ensure_ascii=False),
       j({c["id"]: c["id"] for c in cons}),
       j({c["id"]: c["shares"] for c in cons}, ensure_ascii=False),
       j(NAT, ensure_ascii=False),
       j({c["id"]: c["seats"] for c in cons}))

    text = open(os.path.join(ROOT, "js", "config.js"), encoding="utf8").read()
    m = re.search(r"\n  turkey: \{", text)
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
        anchor = "\n  qc: {"
        text = text.replace(anchor, "\n" + block + anchor, 1)
    open(os.path.join(ROOT, "js", "config.js"), "w",
         encoding="utf8", newline="").write(text)
    print("patched config.js (turkey block)")

    meta = {
        "country": "turkey", "name": "Turkey",
        "election_date": "2028-05-07", "seats": 600, "threshold": 7.0,
        "method": "dhondt", "constituencies": False,
        "notes": ("Per-province D'Hondt (81 provinces, prDistricts), 7% "
                  "national threshold. Baselines: the 2023 general election "
                  "per-province results (tr.wikipedia, YSK data). Polling: "
                  "the tr.wikipedia next-election polling article "
                  "(scrape_turkey.py)."),
    }
    os.makedirs(os.path.join(ROOT, "data", "turkey"), exist_ok=True)
    with open(os.path.join(ROOT, "data", "turkey", "meta.json"), "w",
              encoding="utf8") as fh:
        json.dump(meta, fh, ensure_ascii=False, indent=2)
    print("wrote data/turkey/meta.json")


if __name__ == "__main__":
    main()

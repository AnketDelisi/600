#!/usr/bin/env python3
"""Build the German Wahlkreis (constituency) layer: 299 direct-mandate
districts for the Bundestag.

Geometry: official Bundeswahlleiterin "btw25_geometrie_wahlkreise_shp_geo"
(generalised, WGS84, attributes WKR_NR/WKR_NAME/LAND_NAME). Results:
official kerg2 file, Erststimme per Wahlkreis (the direct mandate vote;
CDU + CSU folded into the Union key). Writes img/germany_wahlkreise.svg,
data/germany/constituencies.json and patches the germany block in
js/config.js (constituencies: true + map2 layer).

Usage: python scraper/build_germany_wahlkreise.py [--force]
"""
import csv
import io
import json
import os
import re
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
SHP_URL = ("https://www.bundeswahlleiterin.de/dam/jcr/"
           "556bec9c-be80-4818-a368-fe6596f15f08/"
           "btw25_geometrie_wahlkreise_shp_geo.zip")
SHP_NAME = "btw25_geometrie_wahlkreise_shp_geo.shp"
CSV_PATH = os.path.join(ROOT, "scraper", ".cache", "de_btw25_kerg2.csv")
OUT_SVG = os.path.join(ROOT, "img", "germany_wahlkreise.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "germany_wahlkreise.svg")
CONST_JSON = os.path.join(ROOT, "data", "germany", "constituencies.json")
ATTRIBUTION = ("Geometrie: Die Bundeswahlleiterin (Wahlkreiskarte BTW 2025); "
               "Ergebnisse: kerg2 (BTW 2025)")

PARTY = {"CDU": "cdu", "CSU": "cdu", "SPD": "spd", "GRÜNE": "gruene",
         "AfD": "afd", "Die Linke": "linke", "FDP": "fdp", "BSW": "bsw"}
PARTIES = ["cdu", "spd", "gruene", "linke", "afd", "fdp", "bsw"]


def main():
    force = "--force" in sys.argv

    # --- Erststimme per Wahlkreis from the official kerg2 file
    txt = open(CSV_PATH, encoding="utf-8-sig").read()
    rows = list(csv.reader(io.StringIO(txt), delimiter=";"))
    hi = next(i for i, r in enumerate(rows) if r and r[0] == "Wahlart")
    hdr = rows[hi]
    data = [dict(zip(hdr, r)) for r in rows[hi + 1:] if len(r) >= len(hdr)]

    def num(s):
        return int(s.replace(".", "").replace(",", "")) if s else 0

    wk_pct, wk_votes, wk_names, wk_land = {}, {}, {}, {}
    land_names, nat_votes = {}, {}
    for r in data:
        if r["Gebietsart"] == "Land" and r["Gruppenart"] == "Partei":
            land_names[r["Gebietsnummer"]] = r["Gebietsname"]
        if r["Gruppenart"] != "Partei" or r["Stimme"] != "1":
            continue
        key = PARTY.get(r["Gruppenname"])
        if not key:
            continue
        if r["Gebietsart"] == "Wahlkreis":
            nr = str(int(r["Gebietsnummer"]))
            wk_pct.setdefault(nr, {}).setdefault(key, 0.0)
            wk_pct[nr][key] += float(r["Prozent"].replace(",", ".")) \
                if r["Prozent"] else 0.0
            wk_votes.setdefault(nr, {}).setdefault(key, 0)
            wk_votes[nr][key] += num(r["Anzahl"])
            wk_names[nr] = r["Gebietsname"]
            wk_land[nr] = r["UegGebietsnummer"]
        elif r["Gebietsart"] == "Bund":
            nat_votes[key] = nat_votes.get(key, 0) + num(r["Anzahl"])
    print("wahlkreise:", len(wk_pct))

    cons = []
    for nr in sorted(wk_pct, key=lambda x: int(x)):
        pp = wk_pct[nr]
        cons.append({"id": nr, "name": wk_names[nr], "seats": 1,
                     "region": land_names.get(wk_land[nr], wk_land[nr]),
                     "results_2022": {p: round(pp.get(p, 0.0), 2)
                                      for p in PARTIES}})
    print("constituencies built:", len(cons))

    # sanity: sum of WK votes = national Erststimme per party
    for p in PARTIES:
        sv = sum(v.get(p, 0) for v in wk_votes.values())
        print(f"  sum-check {p:7s} {sv:>10,} vs Bund {nat_votes.get(p, 0):>10,}"
              f" ({sv - nat_votes.get(p, 0):+d})")
    wins = {}
    for nr, votes in wk_votes.items():
        w = max(PARTIES, key=lambda p: votes.get(p, 0))
        wins[w] = wins.get(w, 0) + 1
    print("direct-mandate winners:", wins)

    os.makedirs(os.path.dirname(CONST_JSON), exist_ok=True)
    with open(CONST_JSON, "w", encoding="utf8") as fh:
        json.dump({"country": "germany", "total_seats": 630,
                   "constituency_seats": 299, "leveling_seats": 0,
                   "constituencies": cons}, fh, ensure_ascii=False, indent=1)

    # --- geometry: official generalised WGS84 shapefile
    sys.argv = ["build_map_svg.py", "--zip", SHP_URL, "--shp", SHP_NAME,
                "--id-field", "WKR_NR", "--attr", "id", "--no-prefix",
                "--out", OUT_SVG, "--attribution", ATTRIBUTION]
    if force:
        sys.argv.append("--force")
    bm.main()
    import shutil
    shutil.copy2(OUT_SVG, BMV_SVG)

    # --- patch config: constituencies flag + map2 layer
    cfg_path = os.path.join(ROOT, "js", "config.js")
    text = open(cfg_path, encoding="utf8").read()
    start = text.index("\n  germany: {")
    m = re.search(r"\n  \w+: \{", text[start + 1:])
    end = (start + 1 + m.start() if m
           else text.index("\n};\n\n// ===== Active country"))
    block = text[start:end]
    if "constituencies: true" not in block:
        block = block.replace(
            "    constituencies: false,        // single national district (Zweitstimme)",
            "    constituencies: true,         // 299 direct mandates (Erststimme)\n"
            "    constituencyRule: 'fptp',     // winner-takes-all, no 12% rule\n"
            "    hideForecastConstituencies: true,")
    map2 = {"svg": "img/germany_wahlkreise.svg", "selector": "id",
            "districts": {c["id"]: c["id"] for c in cons},
            "useConstituencies": True, "hideBlocToggle": True,
            "label": "Wahlkreise (299)"}
    mm = re.search(r"\n\s+map: \{", block)
    depth, k = 0, mm.end() - 1
    while k < len(block):
        if block[k] == "{":
            depth += 1
        elif block[k] == "}":
            depth -= 1
            if depth == 0:
                break
        k += 1
    m2 = re.search(r"\n\s+map2: \{", block)
    if m2:
        depth, k2 = 0, m2.end() - 1
        while k2 < len(block):
            if block[k2] == "{":
                depth += 1
            elif block[k2] == "}":
                depth -= 1
                if depth == 0:
                    break
            k2 += 1
        block = block[:m2.start()] + "\n      map2: " + \
            json.dumps(map2, ensure_ascii=False, indent=6) + block[k2 + 1:]
    else:
        block = block[:k + 1] + ",\n      map2: " + \
            json.dumps(map2, ensure_ascii=False, indent=6) + block[k + 1:]
    open(cfg_path, "w", encoding="utf8").write(text[:start] + block + text[end:])
    print("patched config.js (germany constituencies + map2)")


if __name__ == "__main__":
    main()

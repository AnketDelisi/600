#!/usr/bin/env python3
"""Build the 5 Latvian Saeima electoral districts (velesanu apgabali).

The planning regions are NOT the electoral districts: the Riga district is
Riga city only, while the Pieriga municipalities vote in Vidzeme (plus
Jurmala); Zemgale also differs. The composition is defined in the Saeimas
velesanu likums 7. pants (current redaction, 2026 division):
  01 Riga     Riga
  02 Vidzeme  17 novadi + Jurmala
  03 Latgale  7 novadi + Daugavpils + Rezekne
  04 Kurzeme  5 novadi + Liepaja + Ventspils
  05 Zemgale  6 novadi + Jelgava
Geometry: data.gov.lv "Administrativas teritorijas - 2021/2026" GeoJSON
(42 municipalities, CC0), dissolved per district.

Output: bmv/img/latvia.svg with id="_0N" matching the config selector
'id' (districts 1..5 = riga/vidzeme/latgale/zemgale/kurzeme).

Usage: python scraper/build_latvia_apgabali.py [--apply]
"""
import argparse
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
GEOJSON = ("https://data.gov.lv/dati/dataset/"
           "7bb04db9-97ce-4a30-b93a-10ba8dafd104/resource/"
           "f1fe9a47-62af-4156-84ae-b11ac029b00f/download/"
           "administrativas_teritorijas_2026.geojson")
OUT = os.path.join(ROOT, "bmv", "img", "latvia.gen.svg")
COMBINED = os.path.join(ROOT, "scraper", ".cache", "latvia_apgabali.geojson")
ATTRIBUTION = ("Geometrien: data.gov.lv (CC0) — Administrativas "
               "teritorijas 2026; apgabali per Saeimas velesanu likums 7.p.")

DISTRICTS = {
    "01": ["Rīga"],
    "02": ["Ādažu nov.", "Alūksnes nov.", "Cēsu nov.", "Gulbenes nov.",
           "Ķekavas nov.", "Limbažu nov.", "Madonas nov.", "Mārupes nov.",
           "Ogres nov.", "Olaines nov.", "Ropažu nov.", "Salaspils nov.",
           "Saulkrastu nov.", "Siguldas nov.", "Smiltenes nov.",
           "Valkas nov.", "Valmieras nov.", "Jūrmala"],
    "03": ["Augšdaugavas nov.", "Balvu nov.", "Krāslavas nov.",
           "Līvānu nov.", "Ludzas nov.", "Preiļu nov.", "Rēzeknes nov.",
           "Daugavpils", "Rēzekne"],
    "04": ["Dienvidkurzemes nov.", "Kuldīgas nov.", "Saldus nov.",
           "Talsu nov.", "Ventspils nov.", "Liepāja", "Ventspils"],
    "05": ["Aizkraukles nov.", "Bauskas nov.", "Dobeles nov.",
           "Jelgavas nov.", "Jēkabpils nov.", "Tukuma nov.", "Jelgava"],
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    gj = bm.load_geojson(GEOJSON)
    name_to_district = {}
    for code, names in DISTRICTS.items():
        for n in names:
            name_to_district[n] = code

    features = []
    seen = set()
    for f in gj["features"]:
        name = f["properties"]["nosaukums"]
        code = name_to_district.get(name)
        if not code:
            print(f"  WARNING no district for {name!r}")
            continue
        seen.add(name)
        features.append({"type": "Feature",
                         "properties": {"name": name, "apgabals": code},
                         "geometry": f["geometry"]})
    missing = [n for n in name_to_district if n not in seen]
    if missing:
        print("  WARNING names not in geojson:", missing)
    codes = sorted({f["properties"]["apgabals"] for f in features})
    print(f"municipalities: {len(features)} | districts: {codes}")
    with open(COMBINED, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": features}, fh)

    sys.argv = ["build_map_svg.py", "--geojson", COMBINED,
                "--name-field", "apgabals", "--dissolve",
                "--attr", "id", "--out", OUT,
                "--attribution", ATTRIBUTION]
    bm.main()

    old = open(os.path.join(ROOT, "bmv", "img", "latvia.svg"),
               encoding="utf8", errors="replace").read()
    old_ids = set(re.findall(r'<path\b[^>]*\bid="([^"]+)"', old))
    new = open(OUT, encoding="utf8").read()
    new_ids = set(re.findall(r'<path\b[^>]*\bid="([^"]+)"', new))
    ok = old_ids == new_ids == {"_01", "_02", "_03", "_04", "_05"}
    print(f"ids: old={sorted(old_ids)} new={sorted(new_ids)} "
          f"{'OK' if ok else 'FAIL'}")
    if ok and args.apply:
        for dst in (os.path.join(ROOT, "bmv", "img", "latvia.svg"),
                    os.path.join(ROOT, "img", "latvia.svg")):
            with open(dst, "w", encoding="utf8") as fh:
                fh.write(new)
        os.remove(OUT)
        print("applied to bmv/img and img")


if __name__ == "__main__":
    main()

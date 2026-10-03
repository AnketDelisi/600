#!/usr/bin/env python3
"""Rebuild img/italy.svg (the 20-region map) with the Pelagie dropped.

The region map's Sicilia polygon includes Lampedusa/Linosa (~35.5-35.9N):
invisible at this scale but they stretch the map's bounding box ~13% south.
This rebuilds the SVG from the cached geoBoundaries combined file
(scraper/.cache/it_regions.geojson, WGS84) without those rings, using the
same renderer (build_map_svg.py). build_italy_regions.py carries the same
filter for future rebuilds.

Usage: python scraper/trim_italy_islands.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
COMBINED = os.path.join(ROOT, "scraper", ".cache", "it_regions.geojson")
OUT_SVG = os.path.join(ROOT, "img", "italy.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "italy.svg")
MIN_LAT = 36.5       # drop the Pelagie (Lampedusa 35.5N, Linosa 35.9N)
ATTRIBUTION = ("Risultati: Ministero dell'Interno (elezioni 2022, via "
               "elezionistorico.interno.gov.it); Geometria: geoBoundaries.org")


def main():
    if not os.path.isfile(COMBINED):
        sys.exit("missing %s - run build_italy_regions.py first" % COMBINED)
    gj = json.load(open(COMBINED, encoding="utf8"))
    dropped = 0
    for f in gj["features"]:
        geom = f["geometry"]
        polys = geom["coordinates"] if geom["type"] == "MultiPolygon" \
            else [geom["coordinates"]]
        kept = []
        for poly in polys:
            lats = [p[1] for ring in poly for p in ring]
            if max(lats) >= MIN_LAT:
                kept.append(poly)
            else:
                dropped += 1
        f["geometry"] = {"type": "MultiPolygon", "coordinates": kept}
    print("dropped island polygons:", dropped)
    tmp = COMBINED + ".trimmed"
    json.dump(gj, open(tmp, "w", encoding="utf8"))
    sys.argv = ["build_map_svg.py", "--geojson", tmp, "--name-field", "reg",
                "--attr", "id", "--no-prefix", "--out", OUT_SVG,
                "--attribution", ATTRIBUTION, "--force"]
    bm.main()
    import shutil
    shutil.copy2(OUT_SVG, BMV_SVG)


if __name__ == "__main__":
    main()

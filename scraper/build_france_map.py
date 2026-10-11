#!/usr/bin/env python3
"""Rebuild img/france.svg from GADM 4.1 (96 metropolitan departments).

The old map (a b40 port) was missing the four inner-Paris departments
(Paris, Hauts-de-Seine, Seine-Saint-Denis, Val-de-Marne) - a white hole in
the Ile-de-France. GADM 4.1 FRA ADM2 carries exactly the 96 metropolitan
departments; the department code is looked up by name (the config's
existing DepXX_Name district keys give the 92 mappings, plus the four
missing ones). Output paths get id = the department code, so the config's
districts block becomes {code: code}.

Writes img/france.svg (+ bmv copy).

Usage: python scraper/build_france_map.py [--force]
"""

import json
import os
import re
import sys
import unicodedata

from shapely.geometry import shape, mapping

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm
from fr_departments import NAME_CODE

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
GADM = os.path.join(CACHE, "gadm41_FRA_2.json")
GEOJSON = os.path.join(CACHE, "fr_departments.geojson")
OUT_SVG = os.path.join(ROOT, "img", "france.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "france.svg")
ATTRIBUTION = ("R\u00e9sultats: Minist\u00e8re de l'Int\u00e9rieur (2022, via "
               "en.wikipedia); G\u00e9om\u00e9trie: GADM 4.1")


def fold(s):
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", s.lower())


def main():
    force = "--force" in sys.argv
    name_code = {fold(n): c for n, c in NAME_CODE.items()}
    assert len(name_code) == 96, len(name_code)

    gadm = json.loads(open(GADM, encoding="utf8").read())
    feats = []
    for f in gadm["features"]:
        nm = f["properties"].get("NAME_2")
        code = name_code.get(fold(nm))
        assert code, "unmatched: " + str(nm)
        geom = shape(f["geometry"])
        if geom.geom_type == "Polygon":
            geom = geom.buffer(0)
        feats.append({
            "type": "Feature",
            "properties": {"shapeName": code},
            "geometry": mapping(geom),
        })
    codes = [f["properties"]["shapeName"] for f in feats]
    assert len(codes) == 96 and len(set(codes)) == 96, len(codes)
    with open(GEOJSON, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": feats}, fh,
                  ensure_ascii=False)
    print("geojson: 96 departments")

    sys.argv = ["build_map_svg.py", "--geojson", GEOJSON,
                "--name-field", "shapeName", "--no-prefix",
                "--out", OUT_SVG, "--attribution", ATTRIBUTION]
    if force:
        sys.argv.append("--force")
    bm.main()
    os.makedirs(os.path.dirname(BMV_SVG), exist_ok=True)
    import shutil
    shutil.copy2(OUT_SVG, BMV_SVG)
    print("wrote", OUT_SVG)


if __name__ == "__main__":
    main()

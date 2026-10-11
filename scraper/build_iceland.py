#!/usr/bin/env python3
"""Build the Iceland map (6 constituencies) + patch the is map block.

Geometry: the Commons map "Icelandic general election 2017 - Results by
Constituency.svg" (454 KB, Adobe Illustrator). The six constituencies are
the only paths with fill #BABABA (no labels); the path order was fixed by
rendering them with index labels against Iceland's geography: 0 Northeast,
1 Reykjavik North, 2 Northwest, 3 Reykjavik South, 4 South, 5 Southwest.
The SVG is in SVG coordinates (y down) - pre-flip to cancel build_map_svg's
Mercator flip.

Baselines: data/is/results.json (2024 national shares + per-constituency
shares; district/leveling seat counts from the Althingi 2024 report:
54 district seats (9/9/12/6/9/9) + 9 leveling). The allocator is the Norway
two-tier path (district D'Hondt + leveling by quotient continuation, 5%).

Writes img/iceland.svg (+ bmv copy) and patches the map block into
js/config.js before the pollsterMAE anchor.

Usage: python scraper/build_iceland.py [--force]
"""

import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm
from build_japan import parse_path

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
RAW_SVG = os.path.join(CACHE, "is_constituencies_raw.svg")
GEOJSON = os.path.join(CACHE, "is_constituencies.geojson")
OUT_SVG = os.path.join(ROOT, "img", "iceland.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "iceland.svg")
ATTRIBUTION = ("Rinkimai: en.wikipedia, Hagstofa (2024); "
               "Geometrija: Wikimedia Commons")

# the six #BABABA paths in source order (identified by rendering)
ORDER = ["ne", "rn", "nw", "rs", "s", "sw"]
DISPLAY = {"rn": "Reykjav\u00edk North", "rs": "Reykjav\u00edk South",
           "sw": "Southwest", "nw": "Northwest", "ne": "Northeast",
           "s": "South"}


def extract_geometry():
    raw = open(RAW_SVG, encoding="utf8").read()
    paths = []
    for m in re.finditer(r"<path\b([^>]*?)>", raw, re.S):
        attrs = m.group(1)
        fm = re.search(r'fill="([^"]+)"', attrs)
        dm = re.search(r'\sd="([^"]+)"', attrs)
        if not (fm and dm) or fm.group(1) != "#BABABA":
            continue
        paths.append(dm.group(1))
    assert len(paths) == 6, len(paths)

    feats = []
    for key, d in zip(ORDER, paths):
        rings = []
        for ring in parse_path(d):
            pts = [(px, -py) for px, py in ring]  # pre-flip
            if len(pts) >= 3:
                rings.append(pts)
        assert rings, key
        feats.append({
            "type": "Feature",
            "properties": {"shapeName": key},
            "geometry": {"type": "MultiPolygon",
                         "coordinates": [[r] for r in rings]},
        })
    with open(GEOJSON, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": feats}, fh)
    print("geojson: 6 constituencies")
    return feats


def main():
    force = "--force" in sys.argv
    res = json.loads(open(os.path.join(ROOT, "data", "is", "results.json"),
                          encoding="utf8").read())
    extract_geometry()
    sys.argv = ["build_map_svg.py", "--geojson", GEOJSON,
                "--name-field", "shapeName", "--no-prefix",
                "--out", OUT_SVG, "--attribution", ATTRIBUTION]
    if force:
        sys.argv.append("--force")
    bm.main()
    os.makedirs(os.path.dirname(BMV_SVG), exist_ok=True)
    import shutil
    shutil.copy2(OUT_SVG, BMV_SVG)

    keys = ORDER
    dseats = res["seats"]["district"]
    gebiete = {k: dict(res["districts"][k]["shares"]) for k in keys}
    nat = dict(res["national"]["shares"])

    j = json.dumps
    map_block = f"""    map: {{
      svg: 'img/iceland.svg',
      selector: 'id',
      swingMethod: 'geometric',
      // the 6 constituencies (Commons 2017 map, the six grey paths
      // identified by rendering; boundaries unchanged). District tier:
      // D'Hondt, no threshold; the 9 leveling seats go by quotient
      // continuation (votes/(seats+1)) to parties at or above 5% - the
      // real 2024 method, reproduced exactly at the anchor.
      districts: {j({k: k for k in keys}, ensure_ascii=False)},
      seatDistricts: {j(dseats, ensure_ascii=False)},
      names: {j({k: DISPLAY[k] for k in keys}, ensure_ascii=False)},
      gebiete: {j(gebiete, ensure_ascii=False)},
      national2021: {j(nat, ensure_ascii=False)},
    }},
"""
    cp = os.path.join(ROOT, "js", "config.js")
    text = open(cp, encoding="utf8").read()
    assert "    map: {\n      svg: 'img/iceland.svg'" not in text, \
        "iceland map already present"
    anchor = "    pollsterMAE: {},\n    maeKey: 'IS2028',"
    assert anchor in text, "is block anchor"
    text = text.replace(anchor, map_block + anchor, 1)
    open(cp, "w", encoding="utf8", newline="").write(text)
    print("patched config.js (is map block)")


if __name__ == "__main__":
    main()

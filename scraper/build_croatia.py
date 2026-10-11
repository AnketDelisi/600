#!/usr/bin/env python3
"""Build the Croatia map (10 electoral districts) + patch the hr map block.

Geometry: the Commons map "2024 Croatian parliamentary election map.svg"
(2.16 MB, Inkscape). Its "Constituencies" layer carries the 10 electoral
districts I-X as unlabeled paths; the id -> district mapping below was fixed
by rendering the paths with index labels and matching against the official
composition (Electoral districts of Croatia, since 2023) and the 2024 winner
fills (III and VIII red = Rivers of Justice, the other eight HDZ-blue). The
layer translate is applied and y pre-flipped (build_map_svg flips y for its
Mercator inputs).

Baselines: data/hr/results.json (per-district 2024 coalition shares mapped to
lead parties, plus the XI diaspora). The 10 districts elect 14 seats each and
XI elects 3 (seatDistricts = 143); the 8 minority seats are reservedSeats
(other: 8) - total 151. District tier: per-district D'Hondt with the 5%
threshold applied in each district (districtThreshold).

Writes img/croatia.svg (+ bmv copy) and patches the map block into
js/config.js before the pollsterMAE anchor.

Usage: python scraper/build_croatia.py [--force]
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
RAW_SVG = os.path.join(CACHE, "hr_constituencies_raw.svg")
GEOJSON = os.path.join(CACHE, "hr_districts.geojson")
OUT_SVG = os.path.join(ROOT, "img", "croatia.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "croatia.svg")
ATTRIBUTION = ("Rinkimai: en.wikipedia, DIP (2024); "
               "Geometrija: Wikimedia Commons")

# path id -> district key (see the docstring for the identification method)
PATH_MAP = {
    "path123656": "i", "path1961": "ii", "path31": "iii", "path175": "iv",
    "path45": "v", "path241": "vi", "path19": "vii", "path457": "viii",
    "path47": "ix", "path101": "x",
}
DISTRICT_ORDER = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"]


def extract_geometry():
    raw = open(RAW_SVG, encoding="utf8").read()
    m = re.search(r'inkscape:label="Constituencies"[^>]*'
                  r'transform="translate\(([-\d.]+),([-\d.]+)\)"', raw)
    assert m, "constituencies layer transform"
    tx, ty = float(m.group(1)), float(m.group(2))
    i = raw.find('inkscape:label="Constituencies"')
    j = raw.find('inkscape:label="Meta"', i)
    layer = raw[i:j]

    feats = []
    for pm in re.finditer(r"<path\b([^>]*?)>", layer, re.S):
        attrs = pm.group(1)
        pid = re.search(r'id="([^"]+)"', attrs)
        if not pid or pid.group(1) not in PATH_MAP:
            continue
        key = PATH_MAP[pid.group(1)]
        dm = re.search(r'\sd="([^"]+)"', attrs)
        assert dm, key
        # every constituency path carries the same inner translate
        pt = re.search(r'transform="translate\(([-\d.]+),([-\d.]+)\)"',
                       attrs)
        assert pt, (key, "unexpected path transform")
        ptx, pty = float(pt.group(1)), float(pt.group(2))
        rings = []
        for ring in parse_path(dm.group(1)):
            pts = [(px + ptx + tx, -(py + pty + ty)) for px, py in ring]
            if len(pts) >= 3:
                rings.append(pts)
        assert rings, key
        feats.append({
            "type": "Feature",
            "properties": {"shapeName": key},
            "geometry": {"type": "MultiPolygon",
                         "coordinates": [[r] for r in rings]},
        })
    assert len(feats) == 10, len(feats)
    order = {k: n for n, k in enumerate(DISTRICT_ORDER)}
    feats.sort(key=lambda f: order[f["properties"]["shapeName"]])
    with open(GEOJSON, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": feats}, fh)
    print("geojson: 10 districts")
    return feats


def main():
    force = "--force" in sys.argv
    res = json.loads(open(os.path.join(ROOT, "data", "hr", "results.json"),
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

    keys = DISTRICT_ORDER + ["xi"]
    names, gebiete, seatDistricts = {}, {}, {}
    for k in keys:
        d = res["districts"][k]
        names[k] = d["name"] if k != "xi" else "Diaspora (XI)"
        gebiete[k] = {p: round(v, 2) for p, v in d["shares"].items()}
        seatDistricts[k] = 3 if k == "xi" else 14
    nat = {p: v for p, v in res["national"]["shares"].items()}

    j = json.dumps
    map_block = f"""    map: {{
      svg: 'img/croatia.svg',
      selector: 'id',
      swingMethod: 'geometric',
      // The 10 electoral districts I-X (Commons 2024 map, unlabeled paths
      // identified against the official composition; the 2024 fills confirm
      // III/VIII Rivers of Justice, the rest HDZ). Per-district D'Hondt with
      // the 5% threshold applied inside each district (districtThreshold);
      // baselines are the 2024 coalition shares mapped to their lead parties
      // (Rivers of Justice -> SDP, Our Croatia -> NPS in III / IDS in VIII).
      // The XI diaspora (3 seats) is a modelled district without a shape;
      // the 8 minority seats are reservedSeats.
      districts: {j({k: k for k in keys}, ensure_ascii=False)},
      seatDistricts: {j(seatDistricts, ensure_ascii=False)},
      names: {j(names, ensure_ascii=False)},
      gebiete: {j(gebiete, ensure_ascii=False)},
      national2021: {j(nat, ensure_ascii=False)},
    }},
"""
    cp = os.path.join(ROOT, "js", "config.js")
    text = open(cp, encoding="utf8").read()
    assert "    map: {\n      svg: 'img/croatia.svg'" not in text, \
        "croatia map already present"
    anchor = "    pollsterMAE: {},\n    maeKey: 'HR2028',"
    assert anchor in text, "hr block anchor"
    text = text.replace(anchor, map_block + anchor, 1)
    open(cp, "w", encoding="utf8", newline="").write(text)
    print("patched config.js (hr map block)")


if __name__ == "__main__":
    main()

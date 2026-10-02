#!/usr/bin/env python3
"""Build the 29 Swedish riksdag valkretsar SVG from official sources.

The valkrets definition is in Vallag (2005:837) 4 kap. 2 § (fetched from
riksdagen.se): 26 valkretsar are whole lan, three lan are split —
Stockholms kommun vs the rest of Stockholms lan, Malmo kommun + three
Skane groups, Goteborgs kommun + four Vastra Gotaland groups. Geometry:
geoBoundaries SWE ADM2 (290 kommuner); each kommun is assigned to its lan
by point-in-polygon, then to its valkrets by the law's kommun lists, and
features are dissolved per valkrets (shapely).

Output: bmv/img/sweden.gen.svg with data-label="<valkrets>" matching the
site's selector: 'label' config; then run with --apply to install it into
bmv/img/ and img/.

Usage: python scraper/build_sweden_valkretsar.py [--apply]
"""
import argparse
import json
import os
import re
import subprocess
import sys

import requests

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
LAW_URL = ("https://www.riksdagen.se/sv/dokument-och-lagar/dokument/"
           "svensk-forfattningssamling/vallag-2005837_sfs-2005-837/")
ADM1 = "https://www.geoboundaries.org/api/current/gbOpen/SWE/ADM1/"
ADM2 = "https://www.geoboundaries.org/api/current/gbOpen/SWE/ADM2/"
OUT = os.path.join(ROOT, "bmv", "img", "sweden.gen.svg")
COMBINED = os.path.join(ROOT, "scraper", ".cache", "sweden_kommuner_valkrets.geojson")
ATTRIBUTION = ("Geometrien: geoBoundaries.org (gbOpen) + Vallag (2005:837); "
               "valkretsindelning enligt lag")


def parse_law():
    """Return [(label, [kommun tokens] or None)] for the 29 valkretsar."""
    html = requests.get(LAW_URL, headers={"User-Agent": "Mozilla/5.0"},
                        timeout=60).text
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", text)
    start = text.find("följande valkretsar:")
    end = text.find("Lag (20", start)
    seg = text[start:end]
    items = re.split(r"\s(\d{1,2})\.\s", seg)[1:]
    out = []
    for i in range(0, len(items), 2):
        name = items[i + 1].strip().rstrip(",").strip()
        m = re.match(r"([^(]+?)(?:\s*\(([^)]*)\))?\s*$", name)
        base = m.group(1).strip()
        label = re.sub(r"\s+valkrets$", "", base)
        if label == "Stockholms läns":
            label = "Stockholms län"
        kommuner = None
        if m.group(2) and "undantag" not in m.group(2):
            inner = m.group(2).replace(" och ", ", ")
            inner = re.sub(r"\s*kommuner?\s*$", "", inner)
            kommuner = [k.strip() for k in inner.split(",") if k.strip()]
        out.append((label, kommuner))
    return out


def match_kommun(token, names_folded):
    f = bm.fold(token)
    if f in names_folded:
        return names_folded[f]
    if f.endswith("s") and f[:-1] in names_folded:
        return names_folded[f[:-1]]
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true",
                    help="copy the result over sweden.svg in both dirs")
    args = ap.parse_args()

    valkretsar = parse_law()
    print(f"law valkretsar: {len(valkretsar)}")
    split = {label: k for label, k in valkretsar if k}
    for label, k in split.items():
        print(f"  split: {label} ({len(k)} kommuner)")

    a1 = bm.load_geojson(ADM1)
    a2 = bm.load_geojson(ADM2)
    from shapely.geometry import shape
    from shapely.strtree import STRtree

    lan = [(f["properties"]["shapeName"], shape(f["geometry"]))
           for f in a1["features"]]
    tree = STRtree([g for _, g in lan])

    names_folded = {bm.fold(f["properties"]["shapeName"]):
                    f["properties"]["shapeName"]
                    for f in a2["features"]}
    token_map = {}
    for label, tokens in split.items():
        for t in tokens:
            k = match_kommun(t, names_folded)
            if not k:
                print(f"  WARNING unmatched kommun: {t} ({label})")
            else:
                token_map[bm.fold(k)] = label

    features = []
    for f in a2["features"]:
        name = f["properties"]["shapeName"]
        geom = shape(f["geometry"])
        pt = geom.representative_point()
        lan_name = None
        for idx in tree.query(pt):
            if lan[idx][1].contains(pt):
                lan_name = lan[idx][0]
                break
        if lan_name is None:  # invalid/edge geometry: nearest lan wins
            lan_name = min(lan, key=lambda l: l[1].distance(pt))[0]
        label = token_map.get(bm.fold(name))
        if not label:
            if name == "Stockholm":
                label = "Stockholms kommun"
            elif name == "Malmö":
                label = "Malmö kommun"
            elif bm.fold(name) in ("goteborg", "gothenburg"):
                label = "Göteborgs kommun"
            elif lan_name == "Stockholms län":
                label = "Stockholms län"
            else:
                label = lan_name
        features.append({"type": "Feature",
                         "properties": {"name": name, "valkrets": label},
                         "geometry": f["geometry"]})

    labels = sorted({f["properties"]["valkrets"] for f in features})
    print(f"assigned valkretsar: {len(labels)}")
    print(labels)
    os.makedirs(os.path.dirname(COMBINED), exist_ok=True)
    with open(COMBINED, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": features}, fh)
    print(f"wrote {COMBINED}")

    sys.argv = ["build_map_svg.py", "--geojson", COMBINED,
                "--name-field", "valkrets", "--dissolve",
                "--attr", "data-label", "--out", OUT,
                "--attribution", ATTRIBUTION]
    bm.main()

    # validate against the current hand-made map's labels
    old = open(os.path.join(ROOT, "bmv", "img", "sweden.svg"),
               encoding="utf8", errors="replace").read()
    old_labels = set(re.findall(r'inkscape:label="([^"]+)"', old))
    old_labels -= {"Sverige", "Valkretsar"}  # group labels, not valkretsar
    new = open(OUT, encoding="utf8").read()
    new_labels = set(re.findall(r'data-label="([^"]+)"', new))
    ok = old_labels == new_labels
    print(f"labels match: {'OK' if ok else 'FAIL'} "
          f"old={len(old_labels)} new={len(new_labels)}")
    if not ok:
        print("  missing:", sorted(old_labels - new_labels))
        print("  extra:", sorted(new_labels - old_labels))
    if ok and args.apply:
        for dst in (os.path.join(ROOT, "bmv", "img", "sweden.svg"),
                    os.path.join(ROOT, "img", "sweden.svg")):
            with open(dst, "w", encoding="utf8") as fh:
                fh.write(new)
        os.remove(OUT)
        print("applied to bmv/img and img")


if __name__ == "__main__":
    main()

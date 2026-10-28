#!/usr/bin/env python3
"""Build the Slovenia map (8 electoral constituencies) + patch the si block.

The 8 volilne enote (Kranj, Postojna, Ljubljana Center, Ljubljana Bez igrad,
Celje, Novo mesto, Maribor, Ptuj) are groups of municipalities. The official
composition comes from the electoral law ZDVEDZ (4. clen): each constituency
lists its municipalities; a few municipalities are split across
constituencies (most notably the city of Ljubljana across the four Ljubljana
area constituencies) - those are assigned to the nearest constituency by
centroid (documented approximation; the seat allocation itself stays exact
per constituency).

Municipality shapes: GADM 4.1 ADM2 (212 municipalities), dissolved with
shapely into the 8 constituencies; lon/lat -> build_map_svg projects to
Web Mercator.

Baselines: data/si/results.json (2026 per-constituency shares; the national
shares anchor the swing). 11 seats per constituency (seatDistricts = 88);
the 2 minority seats are reservedSeats.

Writes img/slovenia.svg (+ bmv copy) and patches the map block into
js/config.js before the pollsterMAE anchor.

Usage: python scraper/build_slovenia.py [--force]
"""

import json
import os
import re
import sys
import unicodedata

import requests
from bs4 import BeautifulSoup
from shapely.geometry import Polygon, MultiPolygon, shape
from shapely.ops import unary_union
from shapely.validation import make_valid

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
LAW_URL = ("https://www.tax-fin-lex.si/dokument/podrobnosti/"
           "a637c16c5-e43b-47a5-a436-9e8e6574c05e/clen/"
           "a82bf97c8-65bb-483c-aeb2-0cdfbe924e99")
VE_URL = ("https://raw.githubusercontent.com/stefanb/gurs-rpe/"
          "master/data/VDV/VDV_VE.geojson")
GEOJSON = os.path.join(CACHE, "si_constituencies.geojson")
OUT_SVG = os.path.join(ROOT, "img", "slovenia.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "slovenia.svg")
ATTRIBUTION = ("Rezultati: DVK (2026, via en.wikipedia); "
               "Meje: GURS RPE (VDV_VE); Geometrija: GURS")

# volilna enota code -> key
VE_KEY = {1000: "kranj", 2000: "postojna", 3000: "ljubljana_center",
          4000: "ljubljana_bezigrad", 5000: "celje", 6000: "novo_mesto",
          7000: "maribor", 8000: "ptuj"}
DISPLAY = {"kranj": "Kranj", "postojna": "Postojna",
           "ljubljana_center": "Ljubljana Center",
           "ljubljana_bezigrad": "Ljubljana Be\u017eigrad",
           "celje": "Celje", "novo_mesto": "Novo mesto",
           "maribor": "Maribor", "ptuj": "Ptuj"}


def fold(s):
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", s.lower())


def clean_geometry(geom):
    """Repair invalid polygons and drop tiny interior slivers.

    The official GURS layer is much cleaner than the old GADM municipality
    dissolve, but keep the same repair/fill step for defensive rendering.
    """
    if not geom.is_valid:
        geom = make_valid(geom)
    if geom.geom_type == 'GeometryCollection':
        geom = MultiPolygon([p for p in geom.geoms
                             if p.geom_type == 'Polygon' and not p.is_empty])
    if geom.is_empty:
        return geom
    parts = list(geom.geoms) if geom.geom_type == 'MultiPolygon' else [geom]
    parts = [Polygon(p.exterior) for p in parts if p.area > 0]
    if not parts:
        return geom
    return MultiPolygon(parts) if len(parts) > 1 else parts[0]


def fetch(url, name, force=False):
    path = os.path.join(CACHE, name)
    if force or not os.path.isfile(path):
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"},
                         timeout=300)
        r.raise_for_status()
        open(path, "wb").write(r.content)
    return open(path, "rb").read()


def parse_law(force):
    """VE code -> set of folded whole-municipality names."""
    html = fetch(LAW_URL, "si_law_zdvedz.html", force).decode("utf8")
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", text)
    lists = {}
    for m in re.finditer(
            r"(\d)\.\s*volilna enota\s+[^(]+\(številka volilne enote:\s*"
            r"(\d+)\)\s*obsega območja občin:\s*([^;]+);", text):
        code = int(m.group(2))
        if code not in VE_KEY:
            continue
        names = set()
        for part in m.group(3).split(","):
            part = " ".join(part.split())
            part = re.sub(r"^(del\s+)?(mestne občine|občine|občina)\s+", "",
                          part)
            if part.startswith("del "):
                continue
            part = re.sub(r"\s+in\s+", "\u0000", part)
            for piece in part.split("\u0000"):
                piece = piece.strip()
                if piece:
                    names.add(fold(piece))
        lists.setdefault(code, set()).update(names)
    assert len(lists) == 8, sorted(lists)
    total = sum(len(v) for v in lists.values())
    print("law: 8 constituencies, %d municipality entries" % total)
    return lists


def build_geojson(force):
    """Use the official GURS VDV_VE layer: eight clean constituency polygons.

    The old GADM municipality dissolve left hairline slivers between adjacent
    municipalities (and therefore white scratch lines inside the map). The
    GURS Register of Spatial Units publishes the actual eight electoral-unit
    boundaries, so use that authoritative layer instead.
    """
    raw = fetch(VE_URL, "si_ve.geojson", force)
    gj = json.loads(raw.decode("utf8"))
    by_id = {int(f["properties"]["VDV_ID"]): f for f in gj["features"]}
    assert set(by_id) == set(VE_KEY), sorted(by_id)
    feats = []
    for code, key in sorted(VE_KEY.items(), key=lambda x: x[1]):
        geom = clean_geometry(shape(by_id[code]["geometry"]))
        polys = list(geom.geoms) if geom.geom_type == "MultiPolygon" \
            else [geom]
        rings = []
        for poly in polys:
            rings.append([list(poly.exterior.coords)])
            for hole in poly.interiors:
                rings.append([list(hole.coords)])
        feats.append({
            "type": "Feature",
            "properties": {"shapeName": key},
            "geometry": {"type": "MultiPolygon", "coordinates": rings},
        })
    with open(GEOJSON, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": feats}, fh,
                  ensure_ascii=False)
    print("geojson: 8 official GURS constituencies")
    return feats

def main():
    force = "--force" in sys.argv
    skip_config = "--no-config" in sys.argv
    res = json.loads(open(os.path.join(ROOT, "data", "si", "results.json"),
                          encoding="utf8").read())
    build_geojson(force)
    sys.argv = ["build_map_svg.py", "--geojson", GEOJSON,
                "--name-field", "shapeName", "--no-prefix",
                "--simplify", "0.0002",
                "--out", OUT_SVG, "--attribution", ATTRIBUTION]
    if force:
        sys.argv.append("--force")
    bm.main()
    os.makedirs(os.path.dirname(BMV_SVG), exist_ok=True)
    import shutil
    if os.path.isdir(os.path.dirname(BMV_SVG)):
        shutil.copy2(OUT_SVG, BMV_SVG)

    keys = sorted(DISPLAY)
    assert set(keys) == set(res["districts"]), (
        set(keys) ^ set(res["districts"]))
    gebiete = {k: dict(res["districts"][k]["shares"]) for k in keys}
    nat = dict(res["national"]["shares"])

    j = json.dumps
    map_block = f"""    map: {{
      svg: 'img/slovenia.svg',
      selector: 'id',
      stroke: '#111827',
      swingMethod: 'geometric',
      // the 8 volilne enote (GADM municipalities dissolved by the ZDVEDZ
      // law composition; the split municipalities - Ljubljana above all -
      // are assigned to the nearest constituency, documented). Per-
      // constituency D'Hondt, 11 seats each, with the 4% threshold applied
      // nationally (districtThreshold off); the 2 minority seats are
      // reservedSeats.
      districts: {j({k: k for k in keys}, ensure_ascii=False)},
      seatDistricts: {j({k: 11 for k in keys}, ensure_ascii=False)},
      nationalRemainders: true,
      names: {j({k: DISPLAY[k] for k in keys}, ensure_ascii=False)},
      gebiete: {j(gebiete, ensure_ascii=False)},
      national2021: {j(nat, ensure_ascii=False)},
    }},
"""
    if skip_config:
        print("skipped config patch (--no-config)")
        return
    cp = os.path.join(ROOT, "js", "config.js")
    text = open(cp, encoding="utf8").read()
    assert "    map: {\n      svg: 'img/slovenia.svg'" not in text, \
        "slovenia map already present"
    anchor = "    pollsterMAE: {},\n    maeKey: 'SI2030',"
    assert anchor in text, "si block anchor"
    text = text.replace(anchor, map_block + anchor, 1)
    open(cp, "w", encoding="utf8", newline="").write(text)
    print("patched config.js (si map block)")


if __name__ == "__main__":
    main()

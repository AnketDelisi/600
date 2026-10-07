#!/usr/bin/env python3
"""Build the Denmark map (10 storkredse) + patch the dk config block.

The storkredse shapes are the DAGI opstillingskredse (data.information.dk)
dissolved by their STORKRNR; the per-storkreds 2026 result comes from the
Danmarks Statistik election pages (valgopgStor10..19 = storkreds 1..10).
The map is decorative for the seat model - the Folketing allocates
nationally by Sainte-Lague - so no seatDistricts are emitted (adding them
would switch allocateSeatsByDistrict on and change the validated model).

Writes img/denmark.svg and patches the map block into js/config.js.

Usage: python scraper/build_denmark.py [--force]
"""

import json
import os
import re
import sys
import unicodedata

import requests
from bs4 import BeautifulSoup
from shapely.geometry import shape, mapping
from shapely.ops import unary_union

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
OUT_SVG = os.path.join(ROOT, "img", "denmark.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "denmark.svg")
OPFK_URL = ("https://data.information.dk/open/dagi/geojson/"
            "dagi-500-opstillingskredse.geojson")
OPFK_CACHE = os.path.join(CACHE, "dk_opfk.geojson")
GEOJSON = os.path.join(CACHE, "dk_storkredse.geojson")
DST_BASE = "https://www.dst.dk/valg/Valg2546527/valgopg/"
ATTRIBUTION = ("Resultater: Danmarks Statistik (24. marts 2026); "
               "Geometri: DAGI (data.information.dk)")

KEYS = {
    "K\u00f8benhavn": "kbh",
    "K\u00f8benhavns Omegn": "kbh_omegn",
    "Nordsj\u00e6lland": "nordsjaelland",
    "Bornholm": "bornholm",
    "Sj\u00e6lland": "sjaelland",
    "Fyn": "fyn",
    "Sydjylland": "sydjylland",
    "\u00d8stjylland": "ostjylland",
    "Vestjylland": "vestjylland",
    "Nordjylland": "nordjylland",
}
# dst party letter -> config key
LETTERS = {"A": "s", "B": "rv", "C": "kf", "F": "sf", "H": "bp", "I": "la",
           "M": "m", "O": "df", "V": "v", "\u00c6": "dd", "\u00d8": "el",
           "\u00c5": "alt"}
ORDER = ["s", "sf", "v", "la", "df", "m", "kf", "el", "rv", "dd", "alt", "bp"]


def norm(s):
    s = unicodedata.normalize("NFKD", s or "")
    s = s.encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z]", "", s.lower())


KEYS_NORM = {norm(k): v for k, v in KEYS.items()}


def fetch(url, name, force=False, binary=True):
    path = os.path.join(CACHE, name)
    if force or not os.path.isfile(path):
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"},
                         timeout=300)
        r.raise_for_status()
        open(path, "wb").write(r.content)
    if binary:
        return open(path, "rb").read()
    return open(path, encoding="utf8").read()


def build_geojson(force):
    raw = json.loads(fetch(OPFK_URL, "dk_opfk.geojson", force)
                     .decode("utf8"))
    groups = {}
    for f in raw["features"]:
        p = f["properties"]
        groups.setdefault(p["STORKRNR"], []).append(shape(f["geometry"]))
    feats = []
    for nr in sorted(groups):
        merged = unary_union(groups[nr])
        # the STORKRNAVN comes from the raw features
        name = None
        for f in raw["features"]:
            if f["properties"]["STORKRNR"] == nr:
                name = f["properties"]["STORKRNAVN"]
                break
        feats.append({"type": "Feature",
                      "properties": {"shapeName": name, "nr": nr},
                      "geometry": mapping(merged)})
    with open(GEOJSON, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": feats}, fh,
                  ensure_ascii=False)
    print("storkredse:", len(feats))
    return feats


def resolve_key(name):
    """dst titles use the genitive ('Kobenhavns Storkreds') and a Storkreds
    suffix; the geojson names are bare ('Kobenhavn')."""
    base = re.sub(r"\s+storkreds$", "", name, flags=re.I).strip()
    for cand in (base, base[:-1] if base.endswith("s") else base):
        key = KEYS_NORM.get(norm(cand))
        if key:
            return key
    return None


def parse_dst(force):
    """Per-storkreds 2026 shares from the dst.dk result pages."""
    out = {}
    for n in range(10, 20):
        html = fetch(DST_BASE + "valgopgStor%d.htm" % n,
                     "dk_dst_stor%d.html" % n, force, binary=False)
        soup = BeautifulSoup(html, "lxml")
        title = soup.find("title").get_text(strip=True)
        m = re.search(r"Resultater - (.+?) - Folketingsvalg", title)
        assert m, title
        name = m.group(1).strip()
        key = resolve_key(name)
        assert key, name
        shares = {}
        for tr in soup.find_all("tr"):
            cells = [" ".join(c.get_text(" ", strip=True).split())
                     for c in tr.find_all(["td", "th"])]
            if len(cells) < 3:
                continue
            lm = re.match(r"([A-Z\u00c6\u00d8\u00c5])\. ", cells[0])
            if not lm or lm.group(1) not in LETTERS:
                continue
            pm = re.match(r"(\d+(?:,\d+)?)\s*%", cells[2])
            if not pm:
                continue
            shares[LETTERS[lm.group(1)]] = float(pm.group(1).replace(",", "."))
        assert len(shares) >= 10, (name, shares)
        out[key] = shares
    return out


def main():
    force = "--force" in sys.argv
    feats = build_geojson(force)
    dst = parse_dst(force)
    print("storkredse with results:", len(dst))

    names = {f["properties"]["shapeName"]: KEYS_NORM[norm(f["properties"]["shapeName"])]
             for f in feats}
    assert len(set(names.values())) == 10

    name_map_path = os.path.join(CACHE, "dk_name_map.json")
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

    keys = sorted(names.values())
    gebiete = {}
    for k in keys:
        g = {p: round(dst[k].get(p, 0.0), 2) for p in ORDER}
        gebiete[k] = g
    national = {"s": 21.84, "sf": 11.58, "v": 10.14, "la": 9.37, "df": 9.10,
                "m": 7.70, "kf": 7.59, "el": 6.34, "rv": 5.81, "dd": 5.75,
                "alt": 2.57, "bp": 2.13}
    display = {k: next(n for n, kk in names.items() if kk == k) for k in keys}
    j = json.dumps

    map_block = f"""    map: {{
      svg: 'img/denmark.svg',
      selector: 'id',
      swingMethod: 'geometric',
      // the map is the 10 storkredse with their 2026 result; the seat model
      // stays national (no seatDistricts - adding them would switch the
      // allocator to per-district)
      districts: {j({k: k for k in keys}, ensure_ascii=False)},
      names: {j(display, ensure_ascii=False)},
      gebiete: {j(gebiete, ensure_ascii=False)},
      national2021: {j(national, ensure_ascii=False)},
    }},
"""
    cp = os.path.join(ROOT, "js", "config.js")
    text = open(cp, encoding="utf8").read()
    assert "    map: {\n      svg: 'img/denmark.svg'" not in text, \
        "denmark map already present"
    anchor = "    pollsterMAE: {},\n    maeKey: 'DK2030',"
    assert anchor in text, "dk block anchor"
    text = text.replace(anchor, map_block + anchor, 1)
    open(cp, "w", encoding="utf8").write(text)
    print("patched config.js (dk map block)")


if __name__ == "__main__":
    main()

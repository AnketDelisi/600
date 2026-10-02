#!/usr/bin/env python3
"""Build the 12 Estonian Riigikogu valimisringkonnad SVG from EHAK.

Districts (valimisringkonnad) are unions of counties plus city parts:
  1  Tallinn: Haabersti, Pohja-Tallinn, Kristiine
  2  Tallinn: Kesklinn, Lasnamae, Pirita
  3  Tallinn: Mustamae, Nomme
  4  Harju (excl. Tallinn) + Rapla      8  Jarva + Viljandi
  5  Hiiu + Laane + Saare               9  Jogeva + Tartu (excl. Tartu city)
  6  Laane-Viru                        10  Tartu city
  7  Ida-Viru                          11  Voru + Valga + Polva
                                       12  Parnu
Geometry: EHAK WFS (gsavalik.envir.ee/geoserver/ehak) municipalities
(omavalitsuste_piirid) + Tallinn linnaosad (asustusyksuste_piirid where
tyyp = linnaosa, parent Tallinna linn); dissolved per district (shapely).

Output: bmv/img/estonia.gen.svg with id="NoN" matching the config's
selector: 'id'. Note: the current hand-made map is missing No10 (Tartu
city) — the generated map adds it.

Usage: python scraper/build_estonia_ringkonnad.py [--apply]
"""
import argparse
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
WFS = ("https://gsavalik.envir.ee/geoserver/ehak/wfs?service=WFS"
       "&version=1.1.0&request=GetFeature&outputFormat=application/json"
       "&typeName=")
OUT = os.path.join(ROOT, "bmv", "img", "Estonia.gen.svg")
COMBINED = os.path.join(ROOT, "scraper", ".cache", "estonia_ringkonnad.geojson")
ATTRIBUTION = ("Geometrien: EHAK (Maa- ja Ruumiamet, avaandmed) — "
               "omavalitsused + Tallinna linnaosad")

COUNTY_DISTRICT = {
    "Harju maakond": "No4", "Rapla maakond": "No4",
    "Hiiu maakond": "No5", "Lääne maakond": "No5", "Saare maakond": "No5",
    "Lääne-Viru maakond": "No6",
    "Ida-Viru maakond": "No7",
    "Järva maakond": "No8", "Viljandi maakond": "No8",
    "Jõgeva maakond": "No9", "Tartu maakond": "No9",
    "Võru maakond": "No11", "Valga maakond": "No11", "Põlva maakond": "No11",
    "Pärnu maakond": "No12",
}
LINNAOSA_DISTRICT = {
    "haabersti": "No1", "pohja-tallinna": "No1", "kristiine": "No1",
    "kesklinna": "No2", "lasnamae": "No2", "pirita": "No2",
    "mustamae": "No3", "nomme": "No3",
}


def fetch_layer(name, cache_name):
    return json.loads(bm.fetch_bytes(WFS + name, cache_name))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    ov = fetch_layer("ehak:omavalitsuste_piirid", "ehak_omavalitsused.json")
    ay = fetch_layer("ehak:asustusyksuste_piirid", "ehak_asustusyksused.json")

    features = []
    for f in ov["features"]:
        p = f["properties"]
        name = p["omavalitsus"]
        if name == "Tallinna linn":
            continue  # replaced by its linnaosad
        if name == "Tartu linn":
            district = "No10"
        else:
            district = COUNTY_DISTRICT.get(p["maakond"])
        if not district:
            print(f"  WARNING no district for {name} ({p['maakond']})")
            continue
        features.append({"type": "Feature",
                         "properties": {"name": name,
                                        "ringkond": district},
                         "geometry": f["geometry"]})

    n_lin = 0
    for f in ay["features"]:
        p = f["properties"]
        if p.get("omavalitsus") not in ("Tallinn", "Tallinna linn") or \
                p.get("tyyp") != "linnaosa":
            continue
        key = bm.fold(re.sub(r"\s*linnaosa$", "", p["asustusyksus"]))
        district = LINNAOSA_DISTRICT.get(key)
        if not district:
            print(f"  WARNING no district for linnaosa {p['asustusyksus']}")
            continue
        n_lin += 1
        features.append({"type": "Feature",
                         "properties": {"name": p["asustusyksus"],
                                        "ringkond": district},
                         "geometry": f["geometry"]})

    ids = sorted({f["properties"]["ringkond"] for f in features})
    print(f"municipalities + {n_lin} linnaosad -> districts: {ids}")
    if set(ids) != {f"No{i}" for i in range(1, 13)}:
        print("WARNING: expected No1..No12")

    os.makedirs(os.path.dirname(COMBINED), exist_ok=True)
    with open(COMBINED, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": features}, fh)
    print(f"wrote {COMBINED}")

    sys.argv = ["build_map_svg.py", "--geojson", COMBINED,
                "--name-field", "ringkond", "--dissolve",
                "--attr", "id", "--no-prefix", "--out", OUT,
                "--attribution", ATTRIBUTION]
    bm.main()

    old = open(os.path.join(ROOT, "bmv", "img", "Estonia.svg"),
               encoding="utf8", errors="replace").read()
    old_ids = set(re.findall(r'<path\b[^>]*\bid="([^"]+)"', old))
    new = open(OUT, encoding="utf8").read()
    new_ids = set(re.findall(r'<path\b[^>]*\bid="([^"]+)"', new))
    print(f"old ids: {sorted(old_ids)}")
    print(f"new ids: {sorted(new_ids)}")
    ok = old_ids <= new_ids  # generated adds the missing No10
    print(f"old ids covered: {'OK' if ok else 'FAIL'}")
    if ok and args.apply:
        for dst in (os.path.join(ROOT, "bmv", "img", "Estonia.svg"),
                    os.path.join(ROOT, "img", "Estonia.svg")):
            with open(dst, "w", encoding="utf8") as fh:
                fh.write(new)
        os.remove(OUT)
        print("applied to bmv/img and img")


if __name__ == "__main__":
    main()

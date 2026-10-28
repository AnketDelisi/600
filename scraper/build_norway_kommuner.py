#!/usr/bin/env python3
"""Build Norway's municipal lower layer (357 kommuner).

Base map: 19 Storting constituencies. Lower geometry: Kartverket/GeoNorge
administrative units (WFS GML). Results: valgresultat.no 2025 municipality API.
"""
import json
import os
import sys
import xml.etree.ElementTree as ET

import requests
from shapely.geometry import MultiPolygon, Polygon

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
GML = os.path.join(CACHE, "no_kommuner.gml")
GEOJSON = os.path.join(CACHE, "no_kommuner.geojson")
RESULTS = os.path.join(CACHE, "no_2025_kommuner.json")
OUT_SVG = os.path.join(ROOT, "img", "norway_kommuner.svg")
GML_URL = ("https://wfs.geonorge.no/skwms1/wfs.administrative_enheter"
           "?service=WFS&version=2.0.0&request=GetFeature"
           "&typeNames=app:Kommune&srsName=EPSG:4326")
LIST_URL = "https://ws.geonorge.no/kommuneinfo/v1/kommuner"
API = "https://valgresultat.no/api/2025/st/%s/%s"
ATTRIBUTION = ("Resultater: Valgdirektoratet (Stortingsvalget 2025); "
               "Geometri: Kartverket/GeoNorge")
NS = {"app": "https://skjema.geonorge.no/SOSI/produktspesifikasjon/"
             "AdmEnheter/20240101",
      "gml": "http://www.opengis.net/gml/3.2"}
PARTIES = {"A": "ap", "SV": "sv", "R?DT": "r", "SP": "sp",
           "KRF": "krf", "MDG": "mdg", "V": "v", "H": "h",
           "FRP": "frp"}


def fetch(url, path, force=False):
    if force or not os.path.isfile(path):
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"},
                         timeout=600)
        r.raise_for_status()
        open(path, "wb").write(r.content)
    return open(path, "rb").read()


def parse_geometry(force):
    fetch(GML_URL, GML, force)
    root = ET.parse(GML).getroot()
    feats = []
    for node in root.findall(".//app:Kommune", NS):
        code = node.findtext(".//app:kommunenummer", default="", namespaces=NS)
        name = node.findtext(".//app:kommunenavn", default="", namespaces=NS)
        if not code or not name:
            continue
        polys = []
        for poly in node.findall(".//gml:Polygon", NS):
            ext = poly.find(".//gml:exterior//gml:posList", NS)
            if ext is None or not ext.text:
                continue
            exterior = [tuple(map(float, ext.text.split()[i:i + 2]))
                        for i in range(0, len(ext.text.split()), 2)]
            holes = []
            for hole in poly.findall(".//gml:interior//gml:posList", NS):
                if hole.text:
                    vals = hole.text.split()
                    holes.append([tuple(map(float, vals[i:i + 2]))
                                  for i in range(0, len(vals), 2)])
            try:
                polys.append(Polygon(exterior, holes))
            except Exception:
                continue
        if not polys:
            continue
        geom = MultiPolygon(polys) if len(polys) > 1 else polys[0]
        feats.append({
            "type": "Feature",
            "properties": {"shapeName": code, "name": name},
            "geometry": geom.__geo_interface__,
        })
    assert len(feats) == 357, len(feats)
    with open(GEOJSON, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": feats}, fh,
                  ensure_ascii=False)
    return feats


def fetch_results(force):
    if not force and os.path.isfile(RESULTS):
        return json.load(open(RESULTS, encoding="utf8"))
    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0"})
    national = session.get(API.replace("/%s/%s", ""), timeout=60).json()
    municipalities = []
    for fylke in national["_links"]["related"]:
        f = session.get("https://valgresultat.no/api" + fylke["href"],
                        timeout=60)
        if f.status_code != 200:
            continue
        for kommune in (f.json().get("_links", {}).get("related") or []):
            municipalities.append(kommune)
    assert len(municipalities) == 357, len(municipalities)
    out = {}
    for i, row in enumerate(municipalities):
        code = row["nr"]
        r = session.get("https://valgresultat.no/api" + row["href"],
                        timeout=60)
        if r.status_code != 200:
            continue
        d = r.json()
        shares = {}
        for p in d.get("partier") or []:
            key = PARTIES.get(p["id"]["partikode"])
            if not key:
                continue
            try:
                shares[key] = round(float(p["stemmer"]["resultat"]["prosent"]), 2)
            except (KeyError, TypeError, ValueError):
                pass
        if shares:
            out[code] = {"name": row["navn"], "shares": shares}
        if (i + 1) % 50 == 0:
            print("results", i + 1, "/", len(municipalities))
    assert len(out) == 357, len(out)
    with open(RESULTS, "w", encoding="utf8") as fh:
        json.dump(out, fh, ensure_ascii=False)
    return out


def build_svg(force):
    sys.argv = ["build_map_svg.py", "--geojson", GEOJSON,
                "--name-field", "shapeName", "--no-prefix",
                "--simplify", "0.0002", "--out", OUT_SVG,
                "--attribution", ATTRIBUTION]
    if force:
        sys.argv.append("--force")
    bm.main()


def map2_block(results, feats):
    names = {f["properties"]["shapeName"]: f["properties"]["name"]
             for f in feats}
    districts = {key: key for key in names}
    gebiete = {key: results[key]["shares"] for key in names}
    j = lambda value: json.dumps(value, ensure_ascii=False)
    return """    map2: {
      svg: 'img/norway_kommuner.svg',
      selector: 'id',
      label: 'KOMMUNER',
      layerCount: 357,
      districts: %s,
      names: %s,
      gebiete: %s,
    },
""" % (j(districts), j(names), j(gebiete))


def patch_config(block):
    path = os.path.join(ROOT, "js", "config.js")
    text = open(path, encoding="utf8").read()
    start = text.index("  no: {")
    end = text.index("\n  pt: {", start)
    if "svg: 'img/norway_kommuner.svg'" in text[start:end]:
        print("norway map2 already present; leaving config unchanged")
        return
    anchor = "    pollsterMAE: {},\n    maeKey: 'NO2029',"
    pos = text.index(anchor, start)
    text = text[:pos] + block + text[pos:]
    open(path, "w", encoding="utf8", newline="").write(text)
    print("patched js/config.js with Norway map2")


def main():
    force = "--force" in sys.argv
    results = fetch_results(force)
    feats = parse_geometry(force)
    build_svg(force)
    patch_config(map2_block(results, feats))


if __name__ == "__main__":
    main()

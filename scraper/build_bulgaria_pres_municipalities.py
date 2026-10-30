#!/usr/bin/env python3
"""Build Bulgaria's presidential municipal layer from CEC opendata.

The CEC export has one row per section and six fields per candidate:
number, valid votes, paper votes, machine total, machine 1, machine 2.
Section coordinates are point-matched to the 262 municipal polygons already
used by the parliamentary lower layer, so both maps share the same SVG IDs.
"""
import json
import os
import re
import sys
import zipfile
from collections import defaultdict

from shapely.geometry import Point, shape
from shapely.strtree import STRtree

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
ZIP = os.path.join(CACHE, "bg_pvr202610_export.zip")
GEO = os.path.join(CACHE, "bg_municipalities.geojson")
OUT = os.path.join(ROOT, "data", "bgpres", "municipalities.json")
ZIP_URL = "https://results.cik.bg/pvr202610/opendata/export.zip"
CANDIDATES = {
    "25": "iotova", "4": "gyurov", "11": "kostadinov",
    "17": "vasilev", "19": "mihaylov", "18": "hristanov",
}


def fetch(url, path, force=False):
    if not force and os.path.isfile(path):
        return
    try:
        import requests
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=900)
        r.raise_for_status()
        data = r.content
    except Exception:
        from curl_cffi import requests as creq
        r = creq.get(url, impersonate="chrome", timeout=900)
        r.raise_for_status()
        data = r.content
    open(path, "wb").write(data)


def db(z, prefix):
    for name in z.namelist():
        if prefix in name and name.endswith(".txt"):
            return z.read(name).decode("utf-8-sig", errors="replace")
    raise SystemExit("missing " + prefix)


def build_results(z):
    sections = {}
    for line in db(z, "sections").splitlines():
        p = line.split(";")
        if len(p) < 8 or p[0][:2] == "32":
            continue
        try:
            sections[p[0]] = (float(p[6]), float(p[7]))
        except ValueError:
            continue
    votes = defaultdict(lambda: defaultdict(int))
    totals = defaultdict(int)
    for line in db(z, "votes").splitlines():
        p = line.split(";")
        if len(p) < 8 or p[0] not in sections:
            continue
        for i in range(2, len(p) - 5, 6):
            try:
                number = p[i].strip()
                valid = int(p[i + 1])
            except (ValueError, IndexError):
                continue
            if valid <= 0:
                continue
            totals[p[0]] += valid
            key = CANDIDATES.get(number)
            if key:
                votes[p[0]][key] += valid
    return sections, votes, totals


def main():
    fetch(ZIP_URL, ZIP)
    z = zipfile.ZipFile(ZIP)
    sections, votes, totals = build_results(z)
    feats = json.load(open(GEO, encoding="utf8"))["features"]
    geoms = [shape(f["geometry"]) for f in feats]
    tree = STRtree(geoms)
    grouped = defaultdict(list)
    for code, (lon, lat) in sections.items():
        point = Point(lon, lat)
        hits = [i for i in tree.query(point) if geoms[i].covers(point)]
        # Municipal polygons simplified from geoBoundaries overlap at town
        # boundaries (Yambol city lies inside Tundzha); the smallest containing
        # polygon is the municipality itself, not its surrounding rural one.
        hit = min(hits, key=lambda i: geoms[i].area) if hits else None
        if hit is None:
            continue
        grouped[feats[hit]["properties"]["shapeName"]].append(code)
    out = {}
    for key, codes in sorted(grouped.items()):
        acc = defaultdict(int)
        total = 0
        for code in codes:
            total += totals[code]
            for cand, value in votes[code].items():
                acc[cand] += value
        if total <= 0:
            continue
        shares = {k: round(v * 100 / total, 2) for k, v in acc.items() if v}
        two = acc.get("iotova", 0) + acc.get("gyurov", 0)
        runoff = ({ "iotova": round(acc["iotova"] * 100 / two, 2),
                    "gyurov": round(acc["gyurov"] * 100 / two, 2) }
                  if two > 0 else {})
        out[key] = {"shares": shares, "runoff2026": runoff,
                    "votes": dict(acc), "total": total}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump({"country": "bgpres", "source": "CIK pvr202610 opendata",
               "municipalities": out}, open(OUT, "w", encoding="utf8"),
              ensure_ascii=False, indent=1)
    print("municipalities with results:", len(out), "/", len(feats))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Build the British Columbia riding map + config block.

93 single-member ridings, first-past-the-post. Baselines: the 2024 general
election per-riding party votes from the en.wikipedia article (Elections BC
data). Geometry: BC Data Catalogue WFS layer
WHSE_ADMIN_BOUNDARIES.EBC_ELECTORAL_DISTS_BS11_SVW (2023 redistribution).
Party colors: en.wikipedia infobox colours (OneBC has none - teal assumed).

Writes img/bc_ridings.svg, data/bc/constituencies.json and inserts the bc
block into js/config.js.

Usage: python scraper/build_bc_ridings.py [--force]
"""
import json
import os
import re
import sys

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
OUT_SVG = os.path.join(ROOT, "img", "bc_ridings.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "bc_ridings.svg")
CONST_JSON = os.path.join(ROOT, "data", "bc", "constituencies.json")
ZOOM_SVG = os.path.join(CACHE, "bc_vancouver_detail.svg")
ZOOM_BOX = (-123.35, 49.0, -122.35, 49.55)  # Metro Vancouver
GEOJSON = os.path.join(CACHE, "bc_ridings.geojson")
ARTICLE = "https://en.wikipedia.org/wiki/2024_British_Columbia_general_election"
WFS = ("https://openmaps.gov.bc.ca/geo/pub/WHSE_ADMIN_BOUNDARIES."
       "EBC_ELECTORAL_DISTS_BS11_SVW/ows?service=WFS&version=2.0.0"
       "&request=GetFeature&typeName=WHSE_ADMIN_BOUNDARIES."
       "EBC_ELECTORAL_DISTS_BS11_SVW&outputFormat=json&srsName=EPSG:4326")
ATTRIBUTION = ("Risultati: Elections BC (elezioni 2024, via en.wikipedia); "
               "Geometria: BC Data Catalogue (provincial electoral districts, "
               "redistribuzione 2023)")

PARTIES = ["bcndp", "cpbc", "gpbc", "cbc", "onbc"]
# 2024 party columns in the per-riding table -> config keys
COLS = ["bcndp", "cpbc", "gpbc"]          # then Ind, Other, Total


def num(s):
    return int(re.sub(r"[^\d]", "", s or "") or 0)


def fetch(url, name, force=False, binary=False):
    path = os.path.join(CACHE, name)
    if force or not os.path.isfile(path):
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"},
                         timeout=300)
        r.raise_for_status()
        open(path, "wb").write(r.content)
    return open(path, "rb").read() if binary else \
        open(path, encoding="utf8").read()


def parse_results(html, names):
    soup = BeautifulSoup(html, "lxml")
    out, totals = {}, {}
    for t in soup.find_all("table"):
        rows = t.find_all("tr")
        if len(rows) < 90:
            continue
        hdr = " ".join(rows[0].get_text(" ", strip=True).split())
        if "Riding" not in hdr:
            continue
        for tr in rows[1:]:
            cells = [" ".join(c.get_text(" ", strip=True).split())
                     for c in tr.find_all(["td", "th"])]
            cells = [c for c in cells if c]
            if len(cells) < 8:
                continue
            key = bm.fold(cells[0])
            if key not in names:
                continue
            tail = cells[-6:]
            votes = {COLS[i]: num(tail[i]) for i in range(3)}
            total = num(tail[5])
            if total <= 0:
                continue
            out[key] = {p: round(votes.get(p, 0) * 100 / total, 2)
                        for p in PARTIES}
            totals[key] = total
    return out, totals


def main():
    force = "--force" in sys.argv
    os.makedirs(CACHE, exist_ok=True)

    gj = json.loads(fetch(WFS, "bc_ridings.geojson", force, binary=True))
    print("features:", len(gj["features"]))
    names = {bm.fold(f["properties"]["ED_NAME"]): f["properties"]["ED_NAME"]
             for f in gj["features"]}
    assert len(names) == 93, "expected 93 ridings"

    results, totals = parse_results(fetch(ARTICLE, "bc_2024_article.html", force),
                                    names)
    print("ridings with 2024 results:", len(results),
          "| missing:", sorted(set(names) - set(results))[:8])

    cons = []
    for key, disp in sorted(names.items()):
        r = results.get(key, {p: 0 for p in PARTIES})
        cons.append({"id": key, "name": disp, "seats": 1,
                     "votes2022": totals.get(key, 0), "results_2022": r})
    os.makedirs(os.path.dirname(CONST_JSON), exist_ok=True)
    with open(CONST_JSON, "w", encoding="utf8") as fh:
        json.dump({"country": "bc", "total_seats": 93,
                   "constituency_seats": 93, "leveling_seats": 0,
                   "constituencies": cons}, fh, ensure_ascii=False, indent=1)

    sys.argv = ["build_map_svg.py", "--geojson", GEOJSON,
                "--name-field", "ED_NAME", "--fold", "--attr", "id",
                "--no-prefix", "--out", OUT_SVG, "--attribution", ATTRIBUTION]
    if force:
        sys.argv.append("--force")
    bm.main()
    import shutil
    shutil.copy2(OUT_SVG, BMV_SVG)

    # Metro Vancouver inset: the dense urban ridings are unreadable at
    # province scale (the province simplification eps is ~1.4 km). Render them
    # separately at their own scale - fine detail - and drop a smaller copy
    # into the empty ocean corner south-west of Vancouver Island.
    def bbox(geom):
        xs, ys = [], []
        def walk(c):
            if isinstance(c[0], (int, float)):
                xs.append(c[0]); ys.append(c[1])
            else:
                for x in c:
                    walk(x)
        walk(geom["coordinates"])
        return min(xs), min(ys), max(xs), max(ys)

    urban = []
    for f in gj["features"]:
        x0, y0, x1, y1 = bbox(f["geometry"])
        if x0 >= ZOOM_BOX[0] and y0 >= ZOOM_BOX[1] and \
                x1 <= ZOOM_BOX[2] and y1 <= ZOOM_BOX[3]:
            urban.append(f)
    urban_ids = [bm.fold(f["properties"]["ED_NAME"]) for f in urban]
    print("metro vancouver ridings:", len(urban_ids))
    # Metro Vancouver vs the rest: the simulation's regional swing error uses
    # this partition (there is no BC regional polling, so no mean blend).
    metro = set(urban_ids)
    region_of = {c["id"]: ("metro" if c["id"] in metro else "rest")
                 for c in cons}
    zoom_gj = os.path.join(CACHE, "bc_vancouver.geojson")
    with open(zoom_gj, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": urban}, fh)
    sys.argv = ["build_map_svg.py", "--geojson", zoom_gj,
                "--name-field", "ED_NAME", "--fold", "--attr", "id",
                "--no-prefix", "--out", ZOOM_SVG, "--attribution", ATTRIBUTION,
                "--force"]
    bm.main()
    bm.add_inset(OUT_SVG, ZOOM_SVG, urban_ids, 150, (40, 640),
                 label="Metro Vancouver")
    shutil.copy2(OUT_SVG, BMV_SVG)

    cfg_path = os.path.join(ROOT, "js", "config.js")
    text = open(cfg_path, encoding="utf8").read()
    j = lambda o, ind: json.dumps(o, ensure_ascii=False, indent=ind)
    block = """  bc: {
    name: 'British Columbia',
    seats: 93,
    threshold: 0,                 // no threshold (first-past-the-post)
    method: 'fptp',               // winner-takes-all in 93 single-member ridings
    seatBased: false,             // polls report vote shares (%)
    constituencies: true,         // the map is the 93 ridings
    constituencyRule: 'fptp',
    hideBlocs: true,              // no governing/opposition bloc cards
    hideConstituencyTable: true,
    recencyHalfLifeDays: 14,
    // trend extrapolation to the 2026-10-24 election: momentum is a nudge,
    // not the driver - anchored at the recent poll mean, total move capped
    // at 0.15pp/day (3.2pp over the 21-day horizon), damped and blended at
    // 0.4; the old loose caps moved NDP ~+8pp / ~+29 seats on a noisy slope
    trend: {
      electionDate: '2026-10-24',
      blend: 0.4,
      maxDaily: 0.15,
      windowDays: 120,
      fitDays: 14,
      minPolls: 3,
      dampDays: 10,
    },
    // colours from Template:Canadian party colour (en.wikipedia)
    parties: {
      bcndp: { code: 'BCNDP',   name: 'British Columbia New Democratic Party', name_en: 'British Columbia New Democratic Party', color: '#F4A460' },
      cpbc:  { code: 'CPBC',   name: 'Conservative Party of British Columbia', name_en: 'Conservative Party of British Columbia', color: '#004AAD' },
      gpbc:  { code: 'GPBC', name: 'Green Party of British Columbia', name_en: 'Green Party of British Columbia', color: '#99C955' },
      cbc:   { code: 'CBC', name: 'CentreBC',  name_en: 'CentreBC', color: '#EE2D30' },
      onbc:  { code: '1BC',    name: 'OneBC',     name_en: 'OneBC',    color: '#C49B50' },
    },
    order: ['bcndp', 'cpbc', 'gpbc', 'cbc', 'onbc'],
    parlOrder: ['bcndp', 'gpbc', 'cbc', 'onbc', 'cpbc'],
    // governing party vs the rest (majority = 47 seats)
    blocs: {
      bloc1: { name: 'BC NDP',     short: 'NDP', parties: ['bcndp'], color: '#F4A460' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['cpbc', 'gpbc', 'cbc', 'onbc'], color: '#004AAD' },
    },
    lastElection: {
      date: '2024-10-19',
      // 2024 general election (Elections BC): NDP 47, Con 44, Green 2
      results: { bcndp: 44.86, cpbc: 43.28, gpbc: 8.24, cbc: 0, onbc: 0 },
      seats:   { bcndp: 47, cpbc: 44, gpbc: 2, cbc: 0, onbc: 0 },
    },
    map: {
      svg: 'img/bc_ridings.svg',
      // swing method: geometric mean of log-odds proportional and uniform
      // swing (bounded, no ratio explosions on strongholds)
      swingMethod: 'geometric',
      selector: 'id',
      useConstituencies: true,     // 93 ridings, projected winner takes the seat
      hideBlocToggle: true,        // no NDP-vs-rest bloc coloring
      // parties with no 2024 past inherit a proxy's geographic shape: both
      // OneBC (right-wing split) and CentreBC (the BC United successor) draw
      // from the Conservative vote, so they track the CPBC's 2024 map
      swingProxy: { onbc: 'cpbc', cbc: 'cpbc' },
      // the borrowed shape is shrunk halfway toward the Conservatives'
      // national share (see swingProxyConfidence in districtShares)
      swingProxyConfidence: { onbc: 0.5, cbc: 0.5 },
      districts: @@districts@@,
      // 2024 vote shares per riding (Elections BC)
      gebiete: @@gebiete@@,
      // national baseline for the uniform-swing projection (= 2024 result)
      national2021: { bcndp: 44.86, cpbc: 43.28, gpbc: 8.24, cbc: 0, onbc: 0 },
      // Metro Vancouver vs the rest: used by the simulation's regional swing
      // error (no regional polls, so no regional mean blend)
      regionOf: @@regionOf@@,
    },
    pollsterMAE: {},
    maeKey: 'BC2024',
    logos: {
      bcndp: 'img/bc/BCNDP.svg', cpbc: 'img/bc/CPBC.svg',
      gpbc: 'img/bc/GPBC.svg', cbc: 'img/bc/CBC.svg', onbc: 'img/bc/1BC.svg',
    },
  },
"""
    for ph, val in (
            ("districts", j({c["id"]: c["id"] for c in cons}, 8).replace(
                "\n", "\n      ")),
            ("gebiete", j({c["id"]: c["results_2022"] for c in cons},
                          8).replace("\n", "\n      ")),
            ("regionOf", j(region_of, 8).replace("\n", "\n      ")),
            ):
        block = block.replace("@@%s@@" % ph, val)

    m = re.search(r"\n  bc: \{", text)
    if m:
        depth, k = 0, m.end() - 1
        while k < len(text):
            if text[k] == "{":
                depth += 1
            elif text[k] == "}":
                depth -= 1
                if depth == 0:
                    break
            k += 1
        text = text[:m.start()] + "\n" + block.rstrip()[:-1] + text[k + 1:]
    else:
        anchor = "\n};\n\n// ===== Active country"
        idx = text.index(anchor)
        text = text[:idx] + "\n" + block.rstrip() + text[idx:]
    open(cfg_path, "w", encoding="utf8").write(text)
    print("patched config.js (bc block)")


if __name__ == "__main__":
    main()

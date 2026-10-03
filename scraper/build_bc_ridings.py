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
ZOOM_SVG = os.path.join(ROOT, "img", "bc_vancouver.svg")
ZOOM_BMV = os.path.join(ROOT, "bmv", "img", "bc_vancouver.svg")
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
    out = {}
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
            # 2024 Ind+Other share: proxy shape for CentreBC (the BC United
            # successor; its remnant ran as independents/others in 2024)
            out[key]["_oth"] = round(
                (num(tail[3]) + num(tail[4])) * 100 / total, 2)
    return out


def main():
    force = "--force" in sys.argv
    os.makedirs(CACHE, exist_ok=True)

    gj = json.loads(fetch(WFS, "bc_ridings.geojson", force, binary=True))
    print("features:", len(gj["features"]))
    names = {bm.fold(f["properties"]["ED_NAME"]): f["properties"]["ED_NAME"]
             for f in gj["features"]}
    assert len(names) == 93, "expected 93 ridings"

    results = parse_results(fetch(ARTICLE, "bc_2024_article.html", force),
                            names)
    print("ridings with 2024 results:", len(results),
          "| missing:", sorted(set(names) - set(results))[:8])

    nat_oth = sum(x.get("_oth", 0) for x in results.values()) / \
        max(1, len(results))
    print("national _oth proxy: %.2f" % nat_oth)
    cons = []
    for key, disp in sorted(names.items()):
        r = results.get(key, {p: 0 for p in PARTIES})
        cons.append({"id": key, "name": disp, "seats": 1, "results_2022": r})
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

    # Metro Vancouver zoom layer: the dense urban ridings are unreadable at
    # province scale, so rebuild just those (fully inside the metro box) as a
    # second layer. Same ids -> the app's fills/tooltips work unchanged.
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
    print("metro vancouver ridings:", len(urban))
    zoom_gj = os.path.join(CACHE, "bc_vancouver.geojson")
    with open(zoom_gj, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": urban}, fh)
    sys.argv = ["build_map_svg.py", "--geojson", zoom_gj,
                "--name-field", "ED_NAME", "--fold", "--attr", "id",
                "--no-prefix", "--out", ZOOM_SVG, "--attribution", ATTRIBUTION,
                "--force"]
    bm.main()
    shutil.copy2(ZOOM_SVG, ZOOM_BMV)

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
    // No trend extrapolation: the newest BC poll is a week old and the recent
    // spread (NDP 35-41) makes a fitted slope unreliable; the trend's
    // intercept extrapolates to today from the last data point, which turned
    // a noisy +1.3pp/day slope into a +10pp artifact. Re-add once the
    // campaign produces fresh daily polls.
    map: {
      svg: 'img/bc_ridings.svg',
      selector: 'id',
      useConstituencies: true,     // 93 ridings, projected winner takes the seat
      hideBlocToggle: true,        // no NDP-vs-rest bloc coloring
      // parties with no 2024 past inherit a proxy's geographic shape:
      // OneBC (right-wing split) tracks the Conservatives, CentreBC (the BC
      // United successor) tracks the 2024 Ind+Other vote
      swingProxy: { onbc: 'cpbc', cbc: '_oth' },
      districts: @@districts@@,
      // 2024 vote shares per riding (Elections BC)
      gebiete: @@gebiete@@,
      // national baseline for the uniform-swing projection (= 2024 result)
      national2021: { bcndp: 44.86, cpbc: 43.28, gpbc: 8.24, cbc: 0, onbc: 0, _oth: @@natoth@@ },
    },
    // dense Metro Vancouver ridings, zoomed (same ids as the main map)
    map2: {
      svg: 'img/bc_vancouver.svg',
      selector: 'id',
      districts: @@zoom@@,
      label: 'Metro Vancouver (zoom)',
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
            ("zoom", j({bm.fold(f["properties"]["ED_NAME"]):
                        bm.fold(f["properties"]["ED_NAME"]) for f in urban},
                       8).replace("\n", "\n      ")),
            ("natoth", "%.2f" % nat_oth)):
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

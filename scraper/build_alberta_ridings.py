#!/usr/bin/env python3
"""Build the Alberta riding map + config block (87 ridings, FPTP).

Baselines: the 2023 general election per-riding party votes from the
en.wikipedia article ("Results by riding" table: UCP/NDP/Green/AP/WLC
columns). Geometry: Elections Alberta's "Current Alberta Electoral
Divisions" feature service (87 features). Party colours: wiki module /
infobox (WIP fetched; the minors are documented picks). Calgary and
Edmonton insets render the dense cities at their own scale.

Writes img/alberta.svg, data/alberta/constituencies.json and inserts the
alberta block into js/config.js.

Usage: python scraper/build_alberta_ridings.py [--force]
"""
import json
import os
import re
import shutil
import sys

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm
from scrape_spain import expand_grid

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
OUT_SVG = os.path.join(ROOT, "img", "alberta.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "alberta.svg")
CONST_JSON = os.path.join(ROOT, "data", "alberta", "constituencies.json")
GEOJSON = os.path.join(CACHE, "ab_ridings.geojson")
ARTICLE = "https://en.wikipedia.org/wiki/2023_Alberta_general_election"
FS = ("https://services.arcgis.com/U1hR2EB4RbcbOZPY/arcgis/rest/services/"
      "Current_Alberta_Electoral_Divisions/FeatureServer/0/query")
ATTRIBUTION = ("Risultati: Elections Alberta (elezioni 2023, via "
               "en.wikipedia); Geometria: Elections Alberta (Current "
               "Electoral Divisions)")
ZOOMS = [
    ((-114.35, 50.75, -113.75, 51.25), "Calgary", (790, 60)),
    ((-113.75, 53.30, -113.15, 53.75), "Edmonton", (790, 250)),
]

PARTIES = ["ucp", "ndp", "grn", "lib", "tory", "wlc", "wip", "rpa"]
# the article's party vote columns (index in the row) -> config key
COLS = {10: "ucp", 11: "ndp", 12: "grn", 14: "wlc"}
META = {
    "ucp": ("UCP", "United Conservative Party", "#1A4C8B",
            "Conservatism, Right-wing populism"),
    "ndp": ("NDP", "Alberta New Democratic Party", "#F58220",
            "Social democracy, Progressivism"),
    "grn": ("GRN", "Green Party of Alberta", "#6AB023",
            "Green politics, Progressivism"),
    "lib": ("LIB", "Alberta Liberal Party", "#D71920",
            "Liberalism, Social liberalism"),
    "tory": ("TORY", "Progressive Conservative", "#1F4E79",
             "Progressive conservatism, Red Toryism"),
    "wlc": ("WLC", "Wildrose Loyalty Coalition", "#14532D",
            "Right-wing populism, Alberta separatism"),
    "wip": ("WIP", "Wildrose Independence Party", "#0F8753",
            "Alberta separatism, Right-wing populism"),
    "rpa": ("RPA", "Reform Party of Alberta", "#6B4C9A",
            "Right-wing populism, Populism"),
}
# 2023 official result (vote % and seats)
NAT = {"ucp": 52.63, "ndp": 44.05, "grn": 0.76, "tory": 0.71, "lib": 0.24,
       "wlc": 0.24, "wip": 0.05, "rpa": 0.01}
SEATS23 = {"ucp": 49, "ndp": 38, "grn": 0, "tory": 0, "lib": 0, "wlc": 0,
           "wip": 0, "rpa": 0}
LOGOS = {"ucp": "UCP.svg", "ndp": "NDP.svg", "grn": "GPA.svg",
         "lib": "LIB.svg", "tory": "TORY.svg", "wlc": "WLC.svg",
         "wip": "WIP.svg", "rpa": "RPA.svg"}


def fold(s):
    return bm.fold(s)


def num(s):
    return int(re.sub(r"[^\d]", "", s or "") or 0)


def fetch_geo(force=False):
    if force or not os.path.isfile(GEOJSON):
        r = requests.get(FS, params={
            "where": "1=1", "outFields": "ED_NUMBER,ED_NAME",
            "returnGeometry": "true", "f": "geojson", "outSR": "4326"},
            headers={"User-Agent": "Mozilla/5.0"}, timeout=300)
        r.raise_for_status()
        open(GEOJSON, "w", encoding="utf8").write(r.text)
    return json.loads(open(GEOJSON, encoding="utf8").read())


def parse_2023():
    r = requests.get(ARTICLE, headers={"User-Agent": "Mozilla/5.0"},
                     timeout=300)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "lxml")
    for tb in soup.find_all("table"):
        if len(tb.find_all("tr")) < 50:
            continue
        grid, _ = expand_grid(tb)
        hdr = " ".join(c for c in grid[2][:20]).lower()
        if "ucp" not in hdr or "margin" not in hdr or "green" not in hdr:
            continue
        out = {}
        for row in grid:
            if len(row) < 19 or not row[0].strip():
                continue
            name = row[0].strip()
            if name.lower() in ("riding", "total"):
                continue
            votes = {COLS[c]: num(row[c]) for c in COLS}
            total = num(row[18]) if len(row) > 18 else 0
            if not total:
                continue
            out[fold(name)] = {
                "name": name, "votes": votes, "total": total,
                "shares": {p: round(100 * votes.get(p, 0) / total, 2)
                           for p in PARTIES},
            }
        if len(out) >= 80:
            return out
    raise SystemExit("results-by-riding table not found")


def main():
    force = "--force" in sys.argv
    gj = fetch_geo(force)
    feats = gj["features"]
    print("features:", len(feats))
    assert len(feats) == 87

    res = parse_2023()
    print("ridings parsed:", len(res))
    missing = [f["properties"]["ED_NAME"] for f in feats
               if fold(f["properties"]["ED_NAME"]) not in res]
    print("geometries without results:", missing)

    cons = []
    for f in feats:
        nm = f["properties"]["ED_NAME"]
        r = res.get(fold(nm))
        assert r, nm
        cons.append({"id": fold(nm), "name": nm, "seats": 1,
                     "votes2022": r["total"], "results_2022": r["shares"]})
    ids = [c["id"] for c in cons]
    assert len(set(ids)) == 87, "duplicate folded ids"
    wins = {}
    for c in cons:
        w = max(c["results_2022"], key=c["results_2022"].get)
        wins[w] = wins.get(w, 0) + 1
    print("2023 seat check from the baselines:", wins)

    os.makedirs(os.path.dirname(CONST_JSON), exist_ok=True)
    with open(CONST_JSON, "w", encoding="utf8") as fh:
        json.dump({"country": "alberta", "total_seats": 87,
                   "constituency_seats": 87, "leveling_seats": 0,
                   "constituencies": cons}, fh, ensure_ascii=False, indent=1)

    sys.argv = ["build_map_svg.py", "--geojson", GEOJSON,
                "--name-field", "ED_NAME", "--fold", "--attr", "id",
                "--no-prefix", "--out", OUT_SVG,
                "--attribution", ATTRIBUTION, "--simplify", "0.00012"]
    if force:
        sys.argv.append("--force")
    bm.main()

    # Calgary + Edmonton insets
    def bbox(geom):
        xs, ys = [], []

        def walk(c):
            if isinstance(c[0], (int, float)):
                xs.append(c[0])
                ys.append(c[1])
            else:
                for x in c:
                    walk(x)
        walk(geom["coordinates"])
        return min(xs), min(ys), max(xs), max(ys)

    for zi, (box, label, at) in enumerate(ZOOMS):
        urban = []
        for f in feats:
            x0, y0, x1, y1 = bbox(f["geometry"])
            if x0 >= box[0] and y0 >= box[1] and x1 <= box[2] \
                    and y1 <= box[3]:
                urban.append(f)
        urban_ids = [fold(f["properties"]["ED_NAME"]) for f in urban]
        print("%s inset ridings: %d" % (label, len(urban_ids)))
        zoom_gj = os.path.join(CACHE, "ab_%s.geojson" % label.lower())
        with open(zoom_gj, "w", encoding="utf8") as fh:
            json.dump({"type": "FeatureCollection", "features": urban}, fh)
        zoom_svg = os.path.join(CACHE, "ab_%s_detail.svg" % label.lower())
        sys.argv = ["build_map_svg.py", "--geojson", zoom_gj,
                    "--name-field", "ED_NAME", "--fold", "--attr", "id",
                    "--no-prefix", "--out", zoom_svg,
                    "--attribution", ATTRIBUTION, "--force"]
        bm.main()
        bm.add_inset(OUT_SVG, zoom_svg, urban_ids, 150, at, label=label)
    shutil.copy2(OUT_SVG, BMV_SVG)

    # logos
    dst = os.path.join(ROOT, "img", "alb")
    os.makedirs(dst, exist_ok=True)
    logos = {}
    for key, logo in LOGOS.items():
        shutil.copy2(os.path.join(r"C:\Users\deneme\Desktop\600logo\ALB",
                                  logo), os.path.join(dst, logo))
        logos[key] = "img/alb/" + logo

    j = json.dumps
    parties = "\n".join(
        "      %s: { code: '%s', name: '%s', name_en: '%s', color: '%s', "
        "ideology: \"%s\"}," % (k, META[k][0], META[k][1], META[k][1],
                                META[k][2], META[k][3])
        for k in PARTIES)
    block = """  alberta: {
    name: 'Alberta',
    seats: 87,
    threshold: 0,                 // no threshold (first-past-the-post)
    method: 'fptp',               // winner-takes-all in 87 single-member ridings
    constituencyRule: 'fptp',
    constituencies: true,         // the map is the 87 ridings
    hideBlocs: true,              // no government/opposition bloc cards
    hideConstituencyTable: true,
    recencyHalfLifeDays: 14,
    parties: {
%s
    },
    order: ['ucp', 'ndp', 'grn', 'lib', 'tory', 'wlc', 'wip', 'rpa'],
    parlOrder: ['ndp', 'grn', 'lib', 'rpa', 'tory', 'wlc', 'wip', 'ucp'],
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['ucp'], color: '#1A4C8B' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['ndp', 'grn', 'lib', 'tory', 'wlc', 'wip', 'rpa'], color: '#F58220' },
    },
    lastElection: {
      date: '2023-05-29',
      // 2023 general election (Elections Alberta)
      results: %s,
      seats: %s,
    },
    map: {
      svg: 'img/alberta.svg',
      swingMethod: 'proportional',
      selector: 'id',
      useConstituencies: true,     // 87 ridings, projected winner takes the seat
      districts: %s,
      gebiete: %s,
      // national baseline for the swing (= 2023 result)
      national2021: %s,
    },
    pollsterMAE: {},
    maeKey: 'AB2027',
    logos: %s,
  },
""" % (parties,
       j(NAT, ensure_ascii=False),
       j(SEATS23, ensure_ascii=False),
       j({c["id"]: c["id"] for c in cons}),
       j({c["id"]: c["results_2022"] for c in cons}, ensure_ascii=False),
       j(NAT, ensure_ascii=False),
       '{ ' + ', '.join("%s: '%s'" % (k, v) for k, v in logos.items()) + ' }')

    text = open(os.path.join(ROOT, "js", "config.js"), encoding="utf8").read()
    m = re.search(r"\n  alberta: \{", text)
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
        end = k + 1
        if text[end:end + 1] == ",":
            end += 1
        text = text[:m.start()] + "\n" + block.rstrip("\n") + text[end:]
    else:
        anchor = "\n  qc: {"
        text = text.replace(anchor, "\n" + block + anchor, 1)
    open(os.path.join(ROOT, "js", "config.js"), "w",
         encoding="utf8", newline="").write(text)
    print("patched config.js (alberta block)")

    meta = {
        "country": "alberta", "name": "Alberta",
        "election_date": "2027-05-31", "seats": 87, "threshold": 0,
        "method": "fptp", "constituencies": True,
        "notes": ("FPTP, 87 ridings (the 2019-representation map). "
                  "Baselines: the 2023 general election per-riding votes "
                  "(en.wikipedia, Elections Alberta data). Polling: the "
                  "32nd Alberta general election article's table "
                  "(scrape_alberta.py)."),
    }
    os.makedirs(os.path.join(ROOT, "data", "alberta"), exist_ok=True)
    with open(os.path.join(ROOT, "data", "alberta", "meta.json"), "w",
              encoding="utf8") as fh:
        json.dump(meta, fh, ensure_ascii=False, indent=2)
    print("wrote data/alberta/meta.json")


if __name__ == "__main__":
    main()

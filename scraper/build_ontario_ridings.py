#!/usr/bin/env python3
"""Build the Ontario riding map + config block (124 ridings, FPTP).

Baselines: the 2025 general election per-riding party votes from the
en.wikipedia article ("Results by riding" table: PC/Lib/NDP/Green/NB/Ont
columns). Geometry: the Ministry of Transportation's authoritative
"Ontario 2018 Electoral Districts" feature service (124 features, the
2017-representation ridings still in force for 2029). Party colours from
the en.wikipedia infoboxes (NB/Ont from the module). A Toronto inset
renders the dense core at its own scale.

Writes img/ontario.svg, data/ontario/constituencies.json and inserts the
ontario block into js/config.js.

Usage: python scraper/build_ontario_ridings.py [--force]
"""
import json
import os
import re
import shutil
import sys
import unicodedata

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm
from scrape_spain import expand_grid

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
OUT_SVG = os.path.join(ROOT, "img", "ontario.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "ontario.svg")
CONST_JSON = os.path.join(ROOT, "data", "ontario", "constituencies.json")
GEOJSON = os.path.join(CACHE, "on_ridings.geojson")
ZOOM_SVG = os.path.join(CACHE, "on_toronto_detail.svg")
ZOOM_BOX = (-79.75, 43.55, -79.05, 43.90)   # Toronto core + inner suburbs
ARTICLE = "https://en.wikipedia.org/wiki/2025_Ontario_general_election"
FS = ("https://services.arcgis.com/6iGx1Dq91oKtcE7x/arcgis/rest/services/"
      "Electoral_Districts_Public_View/FeatureServer/0/query")
ATTRIBUTION = ("Risultati: Elections Ontario (elezioni 2025, via "
               "en.wikipedia); Geometria: Ontario Ministry of Transportation "
               "(Electoral Districts, 2017 Representation Order)")

PARTIES = ["pc", "olp", "ndp", "gpo", "nb", "ont"]
# the article's party vote columns (index in the row) -> config key
COLS = {13: "pc", 14: "olp", 15: "ndp", 16: "gpo", 17: "nb", 18: "ont"}
META = {
    "pc": ("PC", "Progressive Conservative", "#1A4782",
           "Conservatism, Populism"),
    "olp": ("OLP", "Ontario Liberal Party", "#D71920",
            "Liberalism, Social liberalism"),
    "ndp": ("NDP", "Ontario New Democratic Party", "#F58220",
            "Social democracy, Democratic socialism"),
    "gpo": ("GPO", "Green Party of Ontario", "#6AB023",
            "Green politics, Progressivism"),
    "nb": ("NB", "New Blue Party", "#02478D",
           "Right-wing populism, Social conservatism"),
    "ont": ("ONT", "Ontario Party", "#0B2B52",
            "Right-wing populism, Libertarianism"),
}
# 2025 official result (vote % and seats); the independent is Bobbi Ann
# Brady (Haldimand-Norfolk, 63.65%), modelled via indIncumbents
NAT = {"pc": 42.97, "olp": 29.95, "ndp": 18.55, "gpo": 4.83, "nb": 0.51,
       "ont": 0.42, "ind": 1.98}
SEATS25 = {"pc": 80, "ndp": 27, "olp": 14, "gpo": 2, "nb": 0, "ont": 0,
           "ind": 1}
BRADY = {"name": "Bobbi Ann Brady", "past": 63.65, "now": 63.65}


def fold(s):
    # MUST match build_map_svg.fold (it keeps ASCII hyphens: 'Oro-Medonte'
    # and 'Chatham-Kent' produce hyphenated svg ids; a stricter fold here
    # left those two ridings uncoloured)
    return bm.fold(s)


def num(s):
    return int(re.sub(r"[^\d]", "", s or "") or 0)


def fetch_geo(force=False):
    path = GEOJSON
    if force or not os.path.isfile(path):
        r = requests.get(FS, params={
            "where": "1=1", "outFields": "ED_ID,NAME",
            "returnGeometry": "true", "f": "geojson", "outSR": "4326"},
            headers={"User-Agent": "Mozilla/5.0"}, timeout=300)
        r.raise_for_status()
        open(path, "w", encoding="utf8").write(r.text)
    return json.loads(open(path, encoding="utf8").read())


def parse_2025():
    r = requests.get(ARTICLE, headers={"User-Agent": "Mozilla/5.0"},
                     timeout=300)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "lxml")
    for tb in soup.find_all("table"):
        if len(tb.find_all("tr")) < 100:
            continue
        grid, _ = expand_grid(tb)
        hdr = " ".join(c for c in grid[1][:24]).lower()
        if "1st place" not in hdr or "green" not in hdr:
            continue
        out = {}
        for row in grid:
            if len(row) < 23 or not row[0].strip():
                continue
            name = row[0].strip()
            if name.lower() in ("riding", "total"):
                continue
            votes = {COLS[c]: num(row[c]) for c in COLS}
            total = num(row[22]) if len(row) > 22 else 0
            if not total:
                continue
            out[fold(name)] = {
                "name": name, "votes": votes, "total": total,
                "shares": {p: round(100 * votes.get(p, 0) / total, 2)
                           for p in PARTIES},
            }
        if len(out) >= 120:
            return out
    raise SystemExit("results-by-riding table not found")


def main():
    force = "--force" in sys.argv
    gj = fetch_geo(force)
    feats = gj["features"]
    print("features:", len(feats))
    assert len(feats) == 124

    res = parse_2025()
    print("ridings parsed:", len(res))
    missing = [f["properties"]["NAME"] for f in feats
               if fold(f["properties"]["NAME"]) not in res]
    print("geometries without results:", missing)

    cons = []
    for f in feats:
        nm = f["properties"]["NAME"]
        r = res.get(fold(nm))
        assert r, nm
        cons.append({"id": fold(nm), "name": nm, "seats": 1,
                     "votes2022": r["total"], "results_2022": r["shares"]})
    ids = [c["id"] for c in cons]
    assert len(set(ids)) == 124, "duplicate folded ids"
    wins = {}
    for c in cons:
        w = max(c["results_2022"], key=c["results_2022"].get)
        wins[w] = wins.get(w, 0) + 1
    # Haldimand-Norfolk was won by the independent Bobbi Ann Brady; the
    # baseline argmax reads the PC there, so move that seat for the check
    wins["pc"] -= 1
    wins["ind"] = 1
    print("2025 seat check from the baselines:", wins)

    os.makedirs(os.path.dirname(CONST_JSON), exist_ok=True)
    with open(CONST_JSON, "w", encoding="utf8") as fh:
        json.dump({"country": "ontario", "total_seats": 124,
                   "constituency_seats": 124, "leveling_seats": 0,
                   "constituencies": cons}, fh, ensure_ascii=False, indent=1)

    sys.argv = ["build_map_svg.py", "--geojson", GEOJSON,
                "--name-field", "NAME", "--fold", "--attr", "id",
                "--no-prefix", "--out", OUT_SVG,
                "--attribution", ATTRIBUTION, "--simplify", "0.00012"]
    if force:
        sys.argv.append("--force")
    bm.main()

    # Toronto inset: the dense core is unreadable at province scale; render
    # the fully-inside ridings at their own scale into the empty north-east
    # corner.
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

    urban = []
    for f in feats:
        x0, y0, x1, y1 = bbox(f["geometry"])
        if x0 >= ZOOM_BOX[0] and y0 >= ZOOM_BOX[1] and \
                x1 <= ZOOM_BOX[2] and y1 <= ZOOM_BOX[3]:
            urban.append(f)
    urban_ids = [fold(f["properties"]["NAME"]) for f in urban]
    print("toronto inset ridings:", len(urban_ids))
    zoom_gj = os.path.join(CACHE, "on_toronto.geojson")
    with open(zoom_gj, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": urban}, fh)
    sys.argv = ["build_map_svg.py", "--geojson", zoom_gj,
                "--name-field", "NAME", "--fold", "--attr", "id",
                "--no-prefix", "--out", ZOOM_SVG,
                "--attribution", ATTRIBUTION, "--force"]
    bm.main()
    bm.add_inset(OUT_SVG, ZOOM_SVG, urban_ids, 150, (790, 60),
                 label="Toronto")
    shutil.copy2(OUT_SVG, BMV_SVG)

    # logos
    dst = os.path.join(ROOT, "img", "ont")
    os.makedirs(dst, exist_ok=True)
    logos = {}
    for key, logo in (("pc", "PC.svg"), ("olp", "OLP.svg"),
                      ("ndp", "NDP.svg"), ("gpo", "GPO.svg"),
                      ("nb", "NB.svg"), ("ont", "ONT.svg")):
        shutil.copy2(os.path.join(r"C:\Users\deneme\Desktop\600logo\ONT",
                                  logo), os.path.join(dst, logo))
        logos[key] = "img/ont/" + logo

    j = json.dumps
    parties = "\n".join(
        "      %s: { code: '%s', name: '%s', name_en: '%s', color: '%s', "
        "ideology: \"%s\"}," % (k, META[k][0], META[k][1], META[k][1],
                                META[k][2], META[k][3])
        for k in PARTIES)
    parties += ("\n      ind:   { code: 'IND', name: 'Independent', "
                "name_en: 'Independent', color: '#6B7280', ideology: "
                "\"Independent\"},")
    block = """  ontario: {
    name: 'Ontario',
    seats: 124,
    threshold: 0,                 // no threshold (first-past-the-post)
    method: 'fptp',               // winner-takes-all in 124 single-member ridings
    constituencyRule: 'fptp',
    constituencies: true,         // the map is the 124 ridings
    hideBlocs: true,              // no government/opposition bloc cards
    hideConstituencyTable: true,
    recencyHalfLifeDays: 14,
    parties: {
%s
    },
    order: ['pc', 'olp', 'ndp', 'gpo', 'nb', 'ont', 'ind'],
    parlOrder: ['ndp', 'gpo', 'olp', 'ont', 'nb', 'pc', 'ind'],
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['pc'], color: '#1A4782' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['olp', 'ndp', 'gpo', 'nb', 'ont'], color: '#D71920' },
    },
    lastElection: {
      date: '2025-02-27',
      // 2025 general election (Elections Ontario)
      results: %s,
      seats: %s,
    },
    map: {
      svg: 'img/ontario.svg',
      // proportional swing (the QC 2026 seat-level post-mortem: it beat
      // the geometric on seat-total MAE and catches collapses/surges)
      swingMethod: 'proportional',
      selector: 'id',
      useConstituencies: true,     // 124 ridings, projected winner takes the seat
      hideBlocToggle: true,        // no government-vs-rest bloc coloring
      districts: %s,
      gebiete: %s,
      // the independent incumbent (Bobbi Ann Brady, Haldimand-Norfolk):
      // her personal vote holds its 2025 level
      indIncumbents: { haldimandnorfolk: %s },
      // national baseline for the swing (= 2025 result)
      national2021: %s,
    },
    pollsterMAE: {},
    maeKey: 'ON2029',
    logos: %s,
  },
""" % (parties,
       j(NAT, ensure_ascii=False),
       j(SEATS25, ensure_ascii=False),
       j({c["id"]: c["id"] for c in cons}),
       j({c["id"]: c["results_2022"] for c in cons}, ensure_ascii=False),
       j(BRADY, ensure_ascii=False),
       j(NAT, ensure_ascii=False),
       '{ ' + ', '.join("%s: '%s'" % (k, v) for k, v in logos.items()) + ' }')

    text = open(os.path.join(ROOT, "js", "config.js"), encoding="utf8").read()
    m = re.search(r"\n  ontario: \{", text)
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
    print("patched config.js (ontario block)")

    meta = {
        "country": "ontario", "name": "Ontario",
        "election_date": "2029-06-07", "seats": 124, "threshold": 0,
        "method": "fptp", "constituencies": True,
        "notes": ("FPTP, 124 ridings (the 2017-representation map, in force "
                  "for 2029). Baselines: the 2025 general election "
                  "per-riding votes (en.wikipedia, Elections Ontario data). "
                  "Polling: the 45th Ontario general election article's "
                  "table (scrape_ontario.py)."),
    }
    os.makedirs(os.path.join(ROOT, "data", "ontario"), exist_ok=True)
    with open(os.path.join(ROOT, "data", "ontario", "meta.json"), "w",
              encoding="utf8") as fh:
        json.dump(meta, fh, ensure_ascii=False, indent=2)
    print("wrote data/ontario/meta.json")


if __name__ == "__main__":
    main()

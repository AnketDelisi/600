#!/usr/bin/env python3
"""Build the Norway map (19 Storting constituencies) + patch the no map block.

The 19 valgdistrikter are the pre-2018 counties, so the shapes come from the
GADM 3.6 adm1 layer (the 2020/2024 county mergers do not apply to Storting
elections). Baselines: the 2025 per-constituency result from the
en.wikipedia results table (shares + district seats; the table's seat column
includes each constituency's leveling seat, marked with a dagger).

Validated at build time: the district tier of the model (modified
Sainte-Lague, first divisor 1.4, no threshold) on the parsed shares with the
parsed district magnitudes reproduces every district's official allocation
exactly, and the totals match the official 169-seat result.

Writes img/norway.svg (+ bmv copy) and patches the map block into
js/config.js before the pollsterMAE anchor.

Usage: python scraper/build_norway.py [--force]
"""

import io
import json
import os
import re
import sys
import unicodedata
import zipfile

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm
from scrape_spain import expand_grid

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
OUT_SVG = os.path.join(ROOT, "img", "norway.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "norway.svg")
GADM_ZIP = os.path.join(CACHE, "gadm36_NOR_shp.zip")
GADM_URL = "https://geodata.ucdavis.edu/gadm/gadm3.6/shp/gadm36_NOR_shp.zip"
GEOJSON = os.path.join(CACHE, "no_fylker.geojson")
WIKI = ("https://en.wikipedia.org/wiki/"
        "2025_Norwegian_parliamentary_election")
ATTRIBUTION = ("Resultater: Valgdirektoratet (2025, via en.wikipedia); "
               "Geometri: GADM 3.6")

# table column order: Ap Frp H SV Sp R MDG KrF V
PARTIES = ["ap", "frp", "h", "sv", "sp", "r", "mdg", "krf", "v"]
TITLE_MAP = {
    "labour party (norway)": "ap",
    "progress party (norway)": "frp",
    "conservative party (norway)": "h",
    "socialist left party (norway)": "sv",
    "socialist left party": "sv",   # the 2025 results table links bare
    "centre party (norway)": "sp",
    "red party (norway)": "r",
    "green party (norway)": "mdg",
    "christian democratic party (norway)": "krf",
    "liberal party (norway)": "v",
}
DISPLAY = {
    "ostfold": "\u00d8stfold", "akershus": "Akershus", "oslo": "Oslo",
    "hedmark": "Hedmark", "oppland": "Oppland", "buskerud": "Buskerud",
    "vestfold": "Vestfold", "telemark": "Telemark",
    "aust_agder": "Aust-Agder", "vest_agder": "Vest-Agder",
    "rogaland": "Rogaland", "hordaland": "Hordaland",
    "sogn": "Sogn og Fjordane", "more": "M\u00f8re og Romsdal",
    "sor_trondelag": "S\u00f8r-Tr\u00f8ndelag",
    "nord_trondelag": "Nord-Tr\u00f8ndelag", "nordland": "Nordland",
    "troms": "Troms", "finnmark": "Finnmark",
}


def fold(s):
    # the GADM dbf mis-encodes the Ø in Østfold as Ã
    s = s.replace("\u00c3", "\u00d8")
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = (s.replace("\u00f8", "o").replace("\u00d8", "O")
         .replace("\u00e6", "ae").replace("\u00c6", "AE")
         .replace("\u00e5", "a").replace("\u00c5", "A"))
    return re.sub(r"[^a-z]", "", s.lower())


FOLD2KEY = {
    "akershus": "akershus", "ostfold": "ostfold", "austagder": "aust_agder",
    "buskerud": "buskerud", "finnmark": "finnmark", "hedmark": "hedmark",
    "hordaland": "hordaland", "moreogromsdal": "more",
    "nordtrondelag": "nord_trondelag", "nordland": "nordland",
    "oppland": "oppland", "oslo": "oslo", "rogaland": "rogaland",
    "sognogfjordane": "sogn", "sortrondelag": "sor_trondelag",
    "telemark": "telemark", "troms": "troms", "vestagder": "vest_agder",
    "vestfold": "vestfold",
}


def fetch(url, name, force=False):
    path = os.path.join(CACHE, name)
    if force or not os.path.isfile(path):
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"},
                         timeout=300)
        r.raise_for_status()
        open(path, "wb").write(r.content)
    return open(path, "rb").read()


def sl(votes, seats, first=1.4):
    """Modified Sainte-Lague (first divisor `first`, then 3, 5, 7, ...)."""
    out = {p: 0 for p in votes}
    for _ in range(seats):
        best, bq = None, -1
        for p, v in votes.items():
            q = v / (first if out[p] == 0 else 2 * out[p] + 1)
            if q > bq:
                best, bq = p, q
        out[best] += 1
    return out


def find_table(tables, pred):
    for t in tables:
        if pred(t.get_text(" ", strip=True)[:400]):
            return t
    return None


def scrape_2025(force):
    html = fetch(WIKI, "no_2025_election.html", force).decode("utf8")
    soup = BeautifulSoup(html, "lxml")
    tables = [t for t in soup.find_all("table")
              if "wikitable" in (t.get("class") or [])]

    # seats by constituency (the value includes the constituency's leveling
    # seat; district seats = value - 1)
    t = find_table(tables, lambda s: "Seats by constituency" in s)
    assert t, "seats-by-constituency table"
    dseats = {}
    for row in expand_grid(t)[0]:
        vals = row
        if len(vals) >= 4 and re.match(r"^\d+$", vals[3]):
            key = FOLD2KEY[fold(vals[0])]
            dseats[key] = int(vals[3]) - 1
    assert len(dseats) == 19 and sum(dseats.values()) == 150, dseats

    # per-constituency result: shares and district seats (the dagger marks
    # the leveling seat)
    t = find_table(tables, lambda s: s.startswith("Constituency")
                   and "Blocs" in s[:120])
    assert t, "constituency results table"
    grid, _ = expand_grid(t)
    gebiete, dstrict = {}, {}
    for row in grid[4:]:
        vals = row
        if len(vals) >= 19 and fold(vals[0]) in FOLD2KEY:
            name = vals[0]
            if not name or name == "Total":
                continue
            key = FOLD2KEY[fold(name)]
            shares = {}
            dsw = {}
            for i, p in enumerate(PARTIES):
                pct = re.match(r"^(\d+(?:\.\d+)?)", vals[1 + 2 * i] or "")
                seats = vals[2 + 2 * i] or ""
                assert pct, (name, p, vals[1 + 2 * i])
                shares[p] = float(pct.group(1))
                # the dagger marks the constituency's leveling seat
                lev = 1 if "\u2020" in seats else 0
                dsw[p] = int(re.match(r"^(\d+)", seats).group(1)) - lev
            assert sum(dsw.values()) == dseats[key], (name, dsw)
            gebiete[key] = shares
            dstrict[key] = dsw
    assert len(gebiete) == 19, sorted(gebiete)

    # national 2025 result (Party/Votes/%/Seats +/–)
    t = find_table(tables, lambda s: "+/\u2013" in s or "+/-" in s)
    assert t, "national results table"
    national, nseats = {}, {}
    for tr in t.find_all("tr"):
        cells = tr.find_all(["td", "th"])
        if len(cells) < 5:
            continue
        a = cells[0].find("a") or cells[1].find("a")
        title = ((a.get("title") if a else "") or "").strip().lower()
        if title not in TITLE_MAP:
            continue
        key = TITLE_MAP[title]
        pct = re.match(r"^(\d+(?:\.\d+)?)", cells[3].get_text(strip=True))
        seats = re.match(r"^(\d+)", cells[4].get_text(strip=True))
        if pct and seats:
            national[key] = float(pct.group(1))
            nseats[key] = int(seats.group(1))
    assert len(national) == 9, national
    assert sum(nseats.values()) == 169, nseats

    # validation: the district tier reproduces every official allocation
    for key in gebiete:
        alloc = sl(gebiete[key], dseats[key])
        official = dstrict[key]
        assert alloc == official, (key, alloc, official)
    print("validated: district tier matches all 19 official allocations")
    return dseats, gebiete, national, nseats


def build_geojson(force):
    raw = fetch(GADM_URL, os.path.basename(GADM_ZIP), force)
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        out = os.path.join(CACHE, "extract_no")
        os.makedirs(out, exist_ok=True)
        z.extractall(out)
    shp = os.path.join(out, "gadm36_NOR_1.shp")
    fields, records = bm.read_dbf(shp[:-4] + ".dbf")
    feats = []
    for idx, rings in bm.read_shp(shp):
        name = records[idx]["NAME_1"]
        key = FOLD2KEY[fold(name)]
        feats.append({
            "type": "Feature",
            "properties": {"shapeName": key},
            "geometry": {"type": "MultiPolygon",
                         "coordinates": [[list(r)] for r in rings]},
        })
    assert len(feats) == 19, len(feats)
    with open(GEOJSON, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": feats}, fh,
                  ensure_ascii=False)
    print("geojson:", len(feats), "features")
    return feats


def main():
    force = "--force" in sys.argv
    dseats, gebiete, national, nseats = scrape_2025(force)
    build_geojson(force)

    sys.argv = ["build_map_svg.py", "--geojson", GEOJSON,
                "--name-field", "shapeName", "--no-prefix",
                "--out", OUT_SVG, "--attribution", ATTRIBUTION]
    if force:
        sys.argv.append("--force")
    bm.main()
    os.makedirs(os.path.dirname(BMV_SVG), exist_ok=True)
    import shutil
    shutil.copy2(OUT_SVG, BMV_SVG)

    keys = sorted(gebiete)
    j = json.dumps
    g = {k: {p: gebiete[k][p] for p in PARTIES} for k in keys}
    sd = {k: dseats[k] for k in keys}
    map_block = f"""    map: {{
      svg: 'img/norway.svg',
      selector: 'id',
      swingMethod: 'geometric',
      // the map is the 19 Storting constituencies with their 2025 result;
      // the two-tier allocator (150 district seats + 19 leveling) reads
      // seatDistricts below
      districts: {j({k: k for k in keys}, ensure_ascii=False)},
      names: {j({k: DISPLAY[k] for k in keys}, ensure_ascii=False)},
      seatDistricts: {j(sd, ensure_ascii=False)},
      gebiete: {j(g, ensure_ascii=False)},
      national2021: {j(national, ensure_ascii=False)},
    }},
"""
    cp = os.path.join(ROOT, "js", "config.js")
    text = open(cp, encoding="utf8").read()
    assert "    map: {\n      svg: 'img/norway.svg'" not in text, \
        "norway map already present"
    anchor = "    pollsterMAE: {},\n    maeKey: 'NO2029',"
    assert anchor in text, "no block anchor"
    text = text.replace(anchor, map_block + anchor, 1)
    open(cp, "w", encoding="utf8", newline="").write(text)
    print("patched config.js (no map block)")


if __name__ == "__main__":
    main()

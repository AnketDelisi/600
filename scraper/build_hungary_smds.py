import io
import json
import os
import re
import sys

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, r"C:\Users\deneme\Desktop\600\scraper")
import build_map_svg as bm
from scrape_spain import expand_grid

CACHE = r"C:\Users\deneme\Desktop\600\scraper\.cache"
ROOT = r"C:\Users\deneme\Desktop\600"

# NVI county (maz) codes, Hungarian alphabetical order
MAZ = {
    "01": "budapest", "02": "baranya", "03": "bacskiskun", "04": "bekes",
    "05": "borsodabaujzemplen", "06": "csongradcsanad", "07": "fejer",
    "08": "gyormosonsopron", "09": "hajdubihar", "10": "heves",
    "11": "jasznagykunszolnok", "12": "komaromesztergom", "13": "nograd",
    "14": "pest", "15": "somogy", "16": "szabolcsszatmarbereg",
    "17": "tolna", "18": "vas", "19": "veszprem", "20": "zala",
}
SMD_COUNT = {
    "budapest": 16, "baranya": 4, "bacskiskun": 6, "bekes": 4,
    "borsodabaujzemplen": 7, "csongradcsanad": 4, "fejer": 5,
    "gyormosonsopron": 5, "hajdubihar": 6, "heves": 3,
    "jasznagykunszolnok": 4, "komaromesztergom": 3, "nograd": 2,
    "pest": 14, "somogy": 4, "szabolcsszatmarbereg": 6, "tolna": 3,
    "vas": 3, "veszprem": 4, "zala": 3,
}
PARTIES = ["tisza", "fidesz", "mh", "dk", "mkkp"]


def norm(s):
    import unicodedata
    s = unicodedata.normalize("NFKD", s or "")
    s = s.encode("ascii", "ignore").decode()
    return re.sub(r"[^A-Za-z]", "", s).lower()


COUNTY_NORM = {norm(k): k for k in SMD_COUNT}


def build_smd_geojson():
    """106 constituency polygons from the NVI oevk.json (poligon = lat lon)."""
    gj = json.load(open(os.path.join(CACHE, "hu_oevk.json"), encoding="utf8"))
    feats = []
    seen = {}
    for f in gj:
        maz, evk = f["maz"], f["evk"]
        county = MAZ.get(maz)
        assert county, "unknown maz " + maz
        smd = maz + evk  # e.g. 0101
        seen.setdefault(county, 0)
        seen[county] += 1
        pts = []
        for pair in f["poligon"].split(","):
            lat, lon = pair.strip().split(" ")
            pts.append([float(lon), float(lat)])
        if pts[0] != pts[-1]:
            pts.append(pts[0])
        feats.append({"type": "Feature",
                      "properties": {"smd": smd, "county": county},
                      "geometry": {"type": "Polygon", "coordinates": [pts]}})
    for c, n in SMD_COUNT.items():
        assert seen.get(c) == n, f"{c}: {seen.get(c)} != {n}"
    out = os.path.join(CACHE, "hu_smd.geojson")
    with open(out, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": feats}, fh)
    print("SMD features:", len(feats))
    return out


def parse_smd_results(html, counties):
    """Per-SMD party votes from the article's constituency results table."""
    soup = BeautifulSoup(html, "lxml")
    smd = {}
    for t in soup.find_all("table"):
        rows = t.find_all("tr")
        if len(rows) < 100:
            continue
        grid, metas = expand_grid(t)
        # header: row with TISZA/Fidesz/MH/DK/MKKP vote columns
        hdr_row = None
        for ri, row in enumerate(grid[:3]):
            uniq = [c for i, c in enumerate(row) if i == 0 or c != row[i - 1]]
            if "TISZA" in uniq and "Fidesz–KDNP" in uniq and "MH" in uniq:
                hdr_row = ri
                break
        if hdr_row is None:
            continue
        # column index of each party's votes cell
        pmap = {}
        for col, span, txt in metas[hdr_row]:
            nm = txt.strip()
            key = {"TISZA": "tisza", "Fidesz–KDNP": "fidesz", "MH": "mh",
                   "DK": "dk", "MKKP": "mkkp"}.get(nm)
            if key and key not in pmap:
                pmap[key] = col
        if len(pmap) < 4:
            continue
        for ri in range(hdr_row + 1, len(grid)):
            row = grid[ri]
            if not row or not row[0]:
                continue
            m = re.match(r"^(.+?)\s+(\d+)$", row[0].strip())
            if not m:
                continue
            county = COUNTY_NORM.get(norm(m.group(1)))
            if not county:
                continue
            evk = int(m.group(2))
            maz = next(k for k, v in MAZ.items() if v == county)
            smd_id = f"{maz}{evk:02d}"
            votes = {}
            for key, col in pmap.items():
                v = re.sub(r"[^\d]", "", row[col] if col < len(row) else "")
                if v:
                    votes[key] = int(v)
            total = sum(votes.values())
            if total < 1000:
                continue
            smd[smd_id] = {p: round(votes.get(p, 0) * 100 / total, 2)
                           for p in PARTIES}
        break
    print("SMD results parsed:", len(smd))
    return smd


def main():
    smd_geo = build_smd_geojson()
    html = open(os.path.join(CACHE, "hu_2026_article.html"),
                encoding="utf8").read()
    smd = parse_smd_results(html, None)
    # cross-check the winners against the county-winner reality
    wins = {}
    for k, v in smd.items():
        w = max(v, key=v.get)
        wins[w] = wins.get(w, 0) + 1
    print("per-SMD winners:", wins)

    name_map = {}
    gj = json.load(open(smd_geo, encoding="utf8"))
    for f in gj["features"]:
        name_map[f["properties"]["smd"]] = f["properties"]["smd"]
    name_map_path = os.path.join(CACHE, "hu_smd_name_map.json")
    with open(name_map_path, "w", encoding="utf8") as fh:
        json.dump(name_map, fh)
    OUT = os.path.join(ROOT, "img", "hungary_smd.svg")
    sys.argv = ["build_map_svg.py", "--geojson", smd_geo,
                "--name-field", "smd", "--fold", "--attr", "id",
                "--no-prefix", "--out", OUT, "--name-map", name_map_path,
                "--attribution", "Geometria: Nemzeti Választási Iroda (OEVK)",
                "--simplify", "0.0008"]
    bm.main()

    out = os.path.join(ROOT, "data", "hu", "smd.json")
    with open(out, "w", encoding="utf8") as fh:
        json.dump({"country": "hu", "smds": smd}, fh, ensure_ascii=False,
                  indent=1)
    print("wrote", out)


if __name__ == "__main__":
    main()

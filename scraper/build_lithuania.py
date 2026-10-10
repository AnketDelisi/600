#!/usr/bin/env python3
"""Build the Lithuania map (71 districts) + patch the lt map block.

Geometry: the Commons map "Lithuanian Seimas 2024 Constituencies.svg" (71
single-member constituency outlines, id="constN"; the Worldwide seat #71 has
no shape). The raw SVG is cached (Commons rate-limits anonymous fetches from
some IPs); the file is converted to GeoJSON and pushed through the standard
build_map_svg pipeline (Mercator not needed - SVG coords are used as-is).

Baselines: per-constituency 2024 round-1 shares scraped from lt.wikipedia
(data/lt/districts.json, 39 districts). The remaining districts (no article)
get a synthesized baseline: the district's official 2024 winner scaled by a
winner premium calibrated on the real districts, other parties at their
national round-1 share. Winners for all 71 come from the en-wiki elected-
members table. The two-round run-off is modelled as first-round plurality
(round-1 leaders won 21/36 run-offs in 2024 - documented approximation).

Writes img/lithuania.svg (+ bmv copy) and patches the map block into
js/config.js before the pollsterMAE anchor.

Usage: python scraper/build_lithuania.py [--force]
"""

import json
import os
import re
import sys

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm
from scrape_spain import expand_grid

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
RAW_SVG = os.path.join(CACHE, "lt_constituencies_raw.svg")
RAW_URL = ("https://upload.wikimedia.org/wikipedia/commons/e/ea/"
           "Lithuanian_Seimas_2024_Constituencies.svg")
OUT_SVG = os.path.join(ROOT, "img", "lithuania.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "lithuania.svg")
GEOJSON = os.path.join(CACHE, "lt_districts.geojson")
ATTRIBUTION = ("Rinkimai: VRK (2024, via en/lt.wikipedia); "
               "Geometrija: Wikimedia Commons")

PARTIES = ["lsdp", "tslkd", "na", "dsvl", "ls", "lvzs", "lp", "llrakss",
           "ns", "dp", "lrp", "lzp", "tts", "cds", "lv"]
# elected-members table "Winning party" prefix -> config key
WINNER_MAP = {
    "LS": "ls", "TS-LKD": "tslkd", "LSDP": "lsdp", "DSVL": "dsvl",
    "NS": "ns", "LLRA-K\u0160S": "llrakss", "PPNA": "na", "LV\u017dS": "lvzs",
    "LP": "lp", "LRP": "lrp", "DP": "dp", "L\u017dP": "lzp",
    "PLT": "other", "Independent": "other",
}


def fetch(url, name, force=False):
    path = os.path.join(CACHE, name)
    if force or not os.path.isfile(path):
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"},
                         timeout=300)
        r.raise_for_status()
        open(path, "wb").write(r.content)
    return open(path, "rb").read()


def parse_path(d):
    """M/L/H/V (+ relative variants, implicit repeats, z) -> list of rings."""
    tokens = re.findall(r"[MLHVmlhvzZ]|-?\d*\.?\d+(?:e-?\d+)?", d)
    rings, cur = [], []
    x = y = 0.0
    start = (0.0, 0.0)
    i = 0
    cmd = None

    def num():
        nonlocal i
        v = float(tokens[i])
        i += 1
        return v

    while i < len(tokens):
        t = tokens[i]
        if re.match(r"[MLHVmlhvzZ]$", t):
            cmd = t
            i += 1
            if cmd in "zZ":
                if cur:
                    rings.append(cur)
                    cur = []
                x, y = start
                cmd = None
                continue
        if cmd is None:
            break
        c = cmd.upper()
        rel = cmd.islower()
        if c == "M":
            nx, ny = num(), num()
            if rel:
                nx, ny = x + nx, y + ny
            if cur:
                rings.append(cur)
            x, y = nx, ny
            start = (x, y)
            cur = [(x, y)]
            cmd = "l" if rel else "L"
        elif c == "L":
            nx, ny = num(), num()
            if rel:
                nx, ny = x + nx, y + ny
            x, y = nx, ny
            cur.append((x, y))
        elif c == "H":
            nx = num()
            if rel:
                nx = x + nx
            x = nx
            cur.append((x, y))
        elif c == "V":
            ny = num()
            if rel:
                ny = y + ny
            y = ny
            cur.append((x, y))
    if cur:
        rings.append(cur)
    return rings


def convert_geometry(force):
    """Commons SVG -> GeoJSON in the site's coordinate space."""
    if not os.path.isfile(RAW_SVG):
        sys.exit("raw Commons SVG missing: " + RAW_SVG)
    raw = open(RAW_SVG, encoding="utf8").read()
    # outer translate + inner scale
    m = re.search(r'id="constituencies"[^>]*transform="translate\(([-\d.]+),([-\d.]+)\)"', raw)
    assert m, "outer transform"
    tx, ty = float(m.group(1)), float(m.group(2))
    m2 = re.search(r'transform="scale\(([\d.]+)\)"', raw)
    sc = float(m2.group(1)) if m2 else 1.0

    feats = []
    for pm in re.finditer(r'<path\b[^>]*id="const(\d+)"[^>]*>', raw):
        num = int(pm.group(1))
        dm = re.search(r'\sd="([^"]+)"', pm.group(0))
        assert dm, num
        rings = []
        for ring in parse_path(dm.group(1)):
            pts = [(sc * px + tx, sc * py + ty) for px, py in ring]
            if len(pts) >= 3:
                rings.append(pts)
        assert rings, num
        feats.append({
            "type": "Feature",
            "properties": {"shapeName": "d%d" % num},
            "geometry": {"type": "MultiPolygon",
                         "coordinates": [[r] for r in rings]},
        })
    assert len(feats) == 70, len(feats)
    with open(GEOJSON, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": feats}, fh)
    print("geojson: 70 constituency shapes (worldwide has no geometry)")
    return feats


def scrape_winners(force):
    """Official 2024 winners (en-wiki elected-members table)."""
    html = fetch("https://en.wikipedia.org/wiki/2024_Lithuanian_parliamentary_election",
                 "lt_2024_election.html", force).decode("utf8")
    soup = BeautifulSoup(html, "lxml")
    t = None
    for tt in soup.find_all("table"):
        if "wikitable" in (tt.get("class") or []) and \
                tt.get_text(" ", strip=True)[:40].startswith("Constituency"):
            t = tt
            break
    assert t, "elected members table"
    winners, names = {}, {}
    for tr in t.find_all("tr"):
        cells = [" ".join(c.get_text(" ", strip=True).split())
                 for c in tr.find_all(["td", "th"])]
        if len(cells) < 3:
            continue
        m = re.match(r"^(\d+)\.$", cells[0])
        if not m:
            continue
        num = int(m.group(1))
        name = cells[1]
        last = cells[-1]
        tok = re.match(r"^([A-Za-z\u0160\u017d\u0161\u017e\u2013\u2014\-]+)", last)
        key = WINNER_MAP.get(tok.group(1)) if tok else None
        assert key, (num, last)
        winners[num] = key
        names[num] = name
    assert len(winners) == 71, len(winners)
    print("official winners:", len(winners))
    return winners, names


def scrape_national(force):
    """2024 national round-1 and PR shares from the results table.

    Grid columns (verified against the article): 4 = PR votes, 5 = PR %,
    6 = PR seats, 7 = first-round votes.
    """
    html = fetch("https://en.wikipedia.org/wiki/2024_Lithuanian_parliamentary_election",
                 "lt_2024_election.html", force).decode("utf8")
    soup = BeautifulSoup(html, "lxml")
    t = None
    for tt in soup.find_all("table"):
        if "wikitable" not in (tt.get("class") or []):
            continue
        head = tt.get_text(" ", strip=True)[:200]
        if "Proportional" in head and "Constituency (first round)" in head:
            t = tt
            break
    assert t, "results table"
    grid, _ = expand_grid(t)
    TITLE_MAP = {
        "social democratic party of lithuania": "lsdp",
        "homeland union": "tslkd",
        "dawn of nemunas": "na",
        "union of democrats": "dsvl",
        "liberals' movement": "ls",
        "lithuanian farmers and greens union": "lvzs",
        "freedom party": "lp",
        "electoral action of poles in lithuania": "llrakss",
        "national alliance": "ns",
        "labour party": "dp",
        "lithuanian regions party": "lrp",
        "lithuanian green party": "lzp",
        "people and justice union": "tts",
    }
    TEXT_SIG = [
        ("social democratic party", "lsdp"), ("homeland union", "tslkd"),
        ("dawn of nemunas", "na"), ("union of democrats", "dsvl"),
        ("liberals' movement", "ls"), ("farmers and greens", "lvzs"),
        ("freedom party", "lp"), ("electoral action of poles", "llrakss"),
        ("national alliance", "ns"), ("labour party", "dp"),
        ("regions party", "lrp"), ("lithuanian green party", "lzp"),
        ("people and justice", "tts"),
    ]
    pr, pr_seats, r1_votes = {}, {}, {}
    total_pr = total_r1 = 0
    for row in grid:
        if len(row) < 8:
            continue
        if row[0] == "Total":
            total_pr = int(re.sub(r"[^\d]", "", row[4]))
            total_r1 = int(re.sub(r"[^\d]", "", row[7]))
            continue
        text = " ".join(str(x) for x in row[:4]).lower()
        key = None
        for sig, v in TEXT_SIG:
            if sig in text:
                key = v
                break
        if not key or key in r1_votes:
            continue
        nums = [re.sub(r"[^\d.]", "", str(row[i])) for i in (4, 5, 6, 7)]
        if all(nums):
            pr[key] = float(nums[1])
            pr_seats[key] = int(float(nums[2]))
            r1_votes[key] = int(float(nums[3]))
    assert total_pr and total_r1, (total_pr, total_r1)
    assert len(r1_votes) == 13, r1_votes
    return pr, pr_seats, total_pr, total_r1, r1_votes


def main():
    force = "--force" in sys.argv
    convert_geometry(force)
    winners, names = scrape_winners(force)
    pr, pr_seats, total_pr, total_r1, r1_votes = scrape_national(force)

    dist = json.loads(open(os.path.join(ROOT, "data", "lt", "districts.json"),
                            encoding="utf8").read())
    # validation: scraped run-off winners must match the official table
    bad = [n for n, d in dist.items() if winners[int(n)] != d["winner"]]
    assert not bad, ("scraped winners disagree with the official table", bad)
    print("validated: scraped run-off winners match the official table (%d)" % len(dist))

    # national round-1 shares of the modelled parties (for the swing baseline)
    nat_r1 = {k: round(100.0 * v / total_r1, 2) for k, v in r1_votes.items()}
    for k in ("cds", "lv"):
        nat_r1[k] = 0.0
    print("national round-1 shares:", nat_r1)

    # winner premium calibrated on the real districts (per party, median;
    # global median as fallback for parties without a real district sample)
    from statistics import median
    by_party = {}
    for n, d in dist.items():
        w = d["winner"]
        if w in nat_r1 and nat_r1[w] > 0 and w in d["round1"]:
            by_party.setdefault(w, []).append(d["round1"][w] / nat_r1[w])
    prem = {p: median(v) for p, v in by_party.items()}
    global_prem = median([x for v in by_party.values() for x in v])
    print("winner premiums:", {p: round(v, 2) for p, v in sorted(prem.items())},
          "| global %.2f" % global_prem)

    # gebiete: real where available, synthesized otherwise
    gebiete = {}
    for num in range(1, 72):
        key = "d%d" % num if num != 71 else "worldwide"
        if str(num) in dist:
            gebiete[key] = {p: dist[str(num)]["round1"].get(p, 0.0)
                            for p in PARTIES}
            continue
        w = winners[num]
        pw = prem.get(w, global_prem)
        gebiete[key] = {p: round(nat_r1.get(p, 0.0) * (pw if p == w else 1.0), 2)
                        for p in PARTIES}

    # district tier reproduction (plurality rule)
    hit = real = 0
    synth_hit = synth = 0
    for num in range(1, 72):
        g = gebiete["d%d" % num if num != 71 else "worldwide"]
        top = max(PARTIES, key=lambda p: g[p])
        if str(num) in dist:
            real += 1
            hit += top == winners[num]
        else:
            synth += 1
            synth_hit += top == winners[num]
    print("plurality rule reproduces %d/%d real district winners "
          "(run-off not modelled); synthesized baselines keep %d/%d winners"
          % (hit, real, synth_hit, synth))

    # geometry -> svg
    sys.argv = ["build_map_svg.py", "--geojson", GEOJSON,
                "--name-field", "shapeName", "--no-prefix",
                "--out", OUT_SVG, "--attribution", ATTRIBUTION]
    if force:
        sys.argv.append("--force")
    bm.main()
    os.makedirs(os.path.dirname(BMV_SVG), exist_ok=True)
    import shutil
    shutil.copy2(OUT_SVG, BMV_SVG)

    keys = ["d%d" % n for n in range(1, 71)] + ["worldwide"]
    disp = {("d%d" % n): names[n] for n in range(1, 71)}
    disp["worldwide"] = "Worldwide (expatriates)"
    j = json.dumps
    map_block = f"""    map: {{
      svg: 'img/lithuania.svg',
      selector: 'id',
      swingMethod: 'geometric',
      // 70 mapped single-member constituencies + the Worldwide seat (no
      // geometry). District winners are projected by first-round plurality
      // from the 2024 baselines; the real two-round run-off is not modelled
      // (round-1 leaders won 21/36 run-offs in 2024 - documented
      // approximation). 32 districts without a lt.wikipedia result article
      // carry a synthesized baseline (per-party winner premiums, global
      // fallback {global_prem:.2f}).
      winnerDistricts: {j({k: 1 for k in keys}, ensure_ascii=False)},
      districts: {j({k: k for k in keys}, ensure_ascii=False)},
      names: {j(disp, ensure_ascii=False)},
      gebiete: {j(gebiete, ensure_ascii=False)},
      national2021: {j(nat_r1, ensure_ascii=False)},
    }},
"""
    cp = os.path.join(ROOT, "js", "config.js")
    text = open(cp, encoding="utf8").read()
    assert "    map: {\n      svg: 'img/lithuania.svg'" not in text, \
        "lithuania map already present"
    anchor = "    pollsterMAE: {},\n    maeKey: 'LT2028',"
    assert anchor in text, "lt block anchor"
    text = text.replace(anchor, map_block + anchor, 1)
    open(cp, "w", encoding="utf8", newline="").write(text)
    print("patched config.js (lt map block)")


if __name__ == "__main__":
    main()

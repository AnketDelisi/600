#!/usr/bin/env python3
"""Add the 2019 previous-election base to the Austria model (base blend).

The austria projection base is the 2024 Nationalrat per-Bundesland
shares. This script adds the 2019 election's per-state shares
(en.wikipedia "Results by state" table, columns OeVP/SPOE/FPOE/Gruene/
NEOS) as prevGebiete + prevNational with baseBlend: 0.75: the projection
reads 0.75 * 2024 + 0.25 * 2019 geography, result views stay pure 2024.
The KPoe has no 2019 column (0.7%, inside Others) and holds its 2024
baseline.

Idempotent: rerunning replaces the block. Usage:
python scraper/build_at_base.py [--force]
"""

import json
import os
import re
import sys

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(__file__))
from scrape_spain import expand_grid

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
CONFIG = os.path.join(ROOT, "js", "config.js")
H = {"User-Agent": "600-poll-scraper/1.0"}
URL = "https://en.wikipedia.org/wiki/2019_Austrian_legislative_election"

STATES = {
    "Burgenland": "burgenland", "Carinthia": "carinthia",
    "Lower Austria": "lower_austria", "Upper Austria": "upper_austria",
    "Salzburg": "salzburg", "Styria": "styria", "Tyrol": "tyrol",
    "Vorarlberg": "vorarlberg", "Vienna": "vienna",
}
COLS = {"ÖVP": "oevp", "SPÖ": "spoe", "FPÖ": "fpoe",
        "Grüne": "gruene", "NEOS": "neos"}
# 2019 national result (official, % of valid); KPoe (0.7) has no column
NAT = {"oevp": 37.46, "spoe": 21.18, "fpoe": 16.17, "gruene": 13.90,
       "neos": 8.10}


def num(s):
    m = re.match(r"(\d+(?:\.\d+)?)", (s or "").strip())
    return float(m.group(1)) if m else None


def main():
    force = "--force" in sys.argv
    os.makedirs(CACHE, exist_ok=True)
    p = os.path.join(CACHE, "at2019_article.html")
    if force or not os.path.isfile(p):
        r = requests.get(URL, headers=H, timeout=300)
        r.raise_for_status()
        open(p, "wb").write(r.content)
    soup = BeautifulSoup(open(p, encoding="utf8").read(), "lxml")

    out = {}
    for t in soup.find_all("table"):
        rows = t.find_all("tr")
        if len(rows) < 8:
            continue
        grid, _ = expand_grid(t)
        hdr = [c.strip() for c in grid[0]]
        if hdr[:2] != ["State", "ÖVP"] or "Turnout" not in hdr:
            continue
        cols = {}
        for ci, h in enumerate(hdr):
            if h in COLS:
                cols[ci] = COLS[h]
        assert len(cols) == 5, hdr
        for row in grid[1:]:
            if not row:
                continue
            key = STATES.get(row[0].strip())
            if not key:
                continue
            shares = {}
            for ci, code in cols.items():
                v = num(row[ci]) if ci < len(row) else None
                if v is not None:
                    shares[code] = v
            out[key] = shares
        break
    assert len(out) == 9, f"expected 9 states, got {len(out)}"
    print("states:", sorted(out))
    print("vienna:", out["vienna"])
    print("burgenland:", out["burgenland"])

    text = open(CONFIG, encoding="utf8").read()
    i = text.find("\n  austria: {")
    assert i >= 0, "austria block not found"
    depth, j = 0, i
    while j < len(text):
        if text[j] == "{":
            depth += 1
        elif text[j] == "}":
            depth -= 1
            if depth == 0:
                break
        j += 1
    seg = text[i:j]
    seg = re.sub(r"\n          // previous-election base \(29 Sep 2019.*?"
                 r"baseBlend: [\d.]+,", "", seg, flags=re.S)
    m = re.search(r"national2021: \{[^}]*\}", seg)
    assert m, "austria national2021 not found"
    jd = json.dumps
    block = (
        ",\n          // previous-election base (29 Sep 2019, en.wikipedia\n"
        "          // per-state table; scraper/build_at_base.py): the\n"
        "          // projection blends 0.75 * 2024 + 0.25 * 2019 geography,\n"
        "          // result views stay pure 2024. KPoe (0.7% in 2019, no\n"
        "          // column) holds its 2024 baseline.\n"
        "          prevGebiete: " + jd(out, ensure_ascii=False) + ",\n"
        "          prevNational: " + jd(NAT) + ",\n"
        "          baseBlend: 0.75"
    )
    seg = seg[:m.end()] + block + seg[m.end():]
    text = text[:i] + seg + text[j:]
    open(CONFIG, "w", encoding="utf8", newline="").write(text)
    print("patched config.js (austria prevGebiete + baseBlend 0.75)")


if __name__ == "__main__":
    main()

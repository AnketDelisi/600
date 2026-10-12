#!/usr/bin/env python3
"""Add the 2021 previous-election base to the Iceland model (base blend).

The is projection base is the 2024 snap election's per-constituency
shares (six constituencies). This script adds the 2021 election's
per-constituency shares (en.wikipedia "Results by constituency" table,
columns D/B/V/S/F/P/C/M) as prevGebiete + prevNational with
baseBlend: 0.75: the projection reads 0.75 * 2024 + 0.25 * 2021
geography, result views stay pure 2024. The Socialist Party (J) has no
2021 column in the table, so it holds its 2024 baseline (the same hold
the base-blend hook applies to any absent party).

Idempotent: rerunning replaces the block. Usage:
python scraper/build_is_base.py [--force]
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
URL = "https://en.wikipedia.org/wiki/2021_Icelandic_parliamentary_election"

# constituency label -> config district key (the is block's names map)
CONST = {
    "Reykjavík North": "rn", "Reykjavík South": "rs", "Southwest": "sw",
    "Northwest": "nw", "Northeast": "ne", "South": "s",
}
# 2021 national result (official, % of valid): only the parties the
# per-constituency table carries (J has no 2021 column -> holds)
NAT = {"d": 24.38, "b": 17.27, "v": 12.57, "s": 9.93, "f": 8.85,
       "p": 8.63, "c": 8.33, "m": 5.45}


def num(s):
    m = re.match(r"(\d+(?:\.\d+)?)", (s or "").strip())
    return float(m.group(1)) if m else None


def main():
    force = "--force" in sys.argv
    os.makedirs(CACHE, exist_ok=True)
    p = os.path.join(CACHE, "is2021_article.html")
    if force or not os.path.isfile(p):
        r = requests.get(URL, headers=H, timeout=300)
        r.raise_for_status()
        open(p, "wb").write(r.content)
    soup = BeautifulSoup(open(p, encoding="utf8").read(), "lxml")

    out = {}
    for t in soup.find_all("table"):
        rows = t.find_all("tr")
        if len(rows) < 5:
            continue
        grid, _ = expand_grid(t)
        hdr = [c.strip() for c in grid[0]]
        if hdr[:2] != ["Constituency", "D"] or "F" not in hdr:
            continue
        cols = {}
        for ci, h in enumerate(hdr):
            if h and len(h) <= 2 and h.isalpha():
                cols[ci] = h.lower()
        if len(cols) < 6:
            continue
        for row in grid[1:]:
            if not row:
                continue
            key = CONST.get(row[0].strip())
            if not key:
                continue
            shares = {}
            for ci, code in cols.items():
                v = num(row[ci]) if ci < len(row) else None
                if v is not None:
                    shares[code] = v
            out[key] = shares
        break
    assert len(out) == 6, f"expected 6 constituencies, got {len(out)}"
    print("constituencies:", sorted(out))
    print("rn:", out["rn"])
    print("ne:", out["ne"])

    text = open(CONFIG, encoding="utf8").read()
    i = text.find("\n  is: {")
    assert i >= 0, "is block not found"
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
    seg = re.sub(r"\n          // previous-election base \(30 Sep 2021.*?"
                 r"baseBlend: [\d.]+,", "", seg, flags=re.S)
    m = re.search(r"national2021: \{[^}]*\}", seg)
    assert m, "is national2021 not found"
    jd = json.dumps
    block = (
        ",\n          // previous-election base (30 Sep 2021, en.wikipedia\n"
        "          // per-constituency table; scraper/build_is_base.py):\n"
        "          // the projection blends 0.75 * 2024 + 0.25 * 2021\n"
        "          // geography, result views stay pure 2024. J\n"
        "          // (Socialist Party) has no 2021 column and holds its\n"
        "          // 2024 baseline.\n"
        "          prevGebiete: " + jd(out, ensure_ascii=False) + ",\n"
        "          prevNational: " + jd(NAT) + ",\n"
        "          baseBlend: 0.75"
    )
    seg = seg[:m.end()] + block + seg[m.end():]
    text = text[:i] + seg + text[j:]
    open(CONFIG, "w", encoding="utf8", newline="").write(text)
    print("patched config.js (is prevGebiete + baseBlend 0.75)")


if __name__ == "__main__":
    main()

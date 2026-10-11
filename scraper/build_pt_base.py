#!/usr/bin/env python3
"""Add the 2024 previous-election base to the Portugal model (base blend).

The pt projection base is the 2025 snap election's per-district shares.
This script adds the 2024 election's shares (en.wikipedia results-by-
constituency table; regional PSD-led coalitions - Madeira First, Azores
AD - fold into the 'ad' slot, same as the 2025 build) as prevGebiete +
prevNational and sets baseBlend: 0.75. districtShares then projects from
0.75 * 2025 + 0.25 * 2024 geography (result views stay pure 2025).

Rationale: Portugal held three national elections in three years
(2022/2024/2025); the 2025 base is a snap-election sample of a churning
party system. The backtest experiment (scraper/backtest.py cycles,
seat-level, same T-0 votes across arms) showed the blend of the two
previous elections never hurt and helped by 0.2-0.75 seat MAE on 230
seats in 3 of 4 arms; 0.75 on the last election was never worse.

Idempotent: rerunning replaces the block. Usage:
python scraper/build_pt_base.py [--force]
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
ARTICLE = "https://en.wikipedia.org/wiki/2024_Portuguese_legislative_election"
H = {"User-Agent": "600-poll-scraper/1.0"}

CONST = {
    "Azores": "azores", "Aveiro": "aveiro", "Beja": "beja",
    "Braga": "braga", "Bragança": "braganca",
    "Castelo Branco": "castelo_branco", "Coimbra": "coimbra",
    "Évora": "evora", "Faro": "faro", "Guarda": "guarda",
    "Leiria": "leiria", "Lisbon": "lisboa", "Portalegre": "portalegre",
    "Porto": "porto", "Santarém": "santarem", "Setúbal": "setubal",
    "Viana do Castelo": "viana_do_castelo", "Vila Real": "vila_real",
    "Viseu": "viseu", "Madeira": "madeira",
    "Europe": "europe", "Outside Europe": "outside_europe",
}
# 2024 header token -> config party (MF = Madeira First, PSD-led)
COLMAP = {"ps": "ps", "ad": "ad", "ch": "ch", "il": "il", "be": "be",
          "cdu": "cdu", "l": "livre", "pan": "pan", "mf": "ad"}
# 2024 national result (official totals, Assembly of the Republic)
NAT_2024 = {"ad": 28.83, "ps": 27.98, "ch": 18.06, "il": 4.94,
            "be": 4.39, "cdu": 3.30, "livre": 3.26, "pan": 1.95}


def num(s):
    m = re.match(r"(\d+(?:[.,]\d+)?)", (s or "").strip())
    return float(m.group(1).replace(",", ".")) if m else None


def fetch(url, name, force=False):
    path = os.path.join(CACHE, name)
    if force or not os.path.isfile(path):
        r = requests.get(url, headers=H, timeout=300)
        r.raise_for_status()
        open(path, "wb").write(r.content)
    return open(path, encoding="utf8").read()


def extract(html):
    soup = BeautifulSoup(html, "lxml")
    for t in soup.find_all("table"):
        txt = t.get_text(" ", strip=True)
        if "Azores" not in txt or "Lisbon" not in txt \
                or len(t.find_all("tr")) < 20:
            continue
        grid, _ = expand_grid(t)
        # header row 1 repeats each party for its (%, seats) pair: keep the
        # first occurrence of each name
        cols, seen = {}, set()
        for col, cell in enumerate(grid[1]):
            nm = cell.split(" ")[0].strip("[] ").lower()
            if nm in COLMAP and nm not in seen:
                cols[col] = COLMAP[nm]
                seen.add(nm)
        assert len(cols) >= 7, cols
        out = {}
        for row in grid[2:]:
            if not row:
                continue
            label = re.sub(r"\s*\[[^\]]*\]\s*", "", row[0]).strip()
            key = CONST.get(label)
            if not key:
                continue
            shares = {}
            for col, pk in cols.items():
                v = num(row[col]) if col < len(row) else None
                if v is not None:
                    shares[pk] = shares.get(pk, 0) + v
            out[key] = {k: round(v, 2) for k, v in shares.items()}
        return out
    raise SystemExit("2024 results table not found")


def main():
    force = "--force" in sys.argv
    os.makedirs(CACHE, exist_ok=True)
    gebiete = extract(fetch(ARTICLE, "pt_2024_article.html", force))
    missing = set(CONST.values()) - set(gebiete)
    assert not missing, f"missing districts: {sorted(missing)}"
    print("districts:", len(gebiete))
    sums = {}
    for d in gebiete.values():
        for k, v in d.items():
            sums[k] = sums.get(k, 0) + v
    print("sum/22:", {k: round(v / 22, 1) for k, v in sorted(sums.items())})
    print("lisboa:", gebiete["lisboa"], "| madeira:", gebiete["madeira"])

    text = open(CONFIG, encoding="utf8").read()
    i = text.find("\n  pt: {")
    assert i >= 0, "pt block not found"
    j = i
    depth = 0
    while j < len(text):
        if text[j] == "{":
            depth += 1
        elif text[j] == "}":
            depth -= 1
            if depth == 0:
                break
        j += 1
    seg = text[i:j]
    # drop an existing block first (idempotent reruns)
    seg = re.sub(r"\n      prevGebiete: .*?,\n      prevNational: .*?,\n"
                 r"      baseBlend: [\d.]+,", "", seg, flags=re.S)
    anchor = re.search(r"\n      national2021: \{[^}]*\},", seg)
    assert anchor, "national2021 anchor not found in pt map block"
    jd = json.dumps
    block = (
        "\n      // previous-election base (2024; scraper/build_pt_base.py):\n"
        "      // the projection blends 0.75 * 2025 + 0.25 * 2024 geography,\n"
        "      // the result views stay pure 2025. Parties absent from 2024\n"
        "      // (jpp) hold their 2025 baseline.\n"
        "      prevGebiete: " + jd(gebiete, ensure_ascii=False) + ",\n"
        "      prevNational: " + jd(NAT_2024, ensure_ascii=False) + ",\n"
        "      baseBlend: 0.75,"
    )
    seg = seg[:anchor.end()] + block + seg[anchor.end():]
    text = text[:i] + seg + text[j:]
    open(CONFIG, "w", encoding="utf8", newline="").write(text)
    print("patched config.js (pt prevGebiete + baseBlend 0.75)")


if __name__ == "__main__":
    main()

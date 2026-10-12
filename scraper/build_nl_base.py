#!/usr/bin/env python3
"""Add the 2023 previous-election base to the Netherlands model (base blend).

The netherlands projection base is the 2025 result per province (12
provinces; GL/PvdA folded into the PRO code). This script adds the 2023
election's per-province shares (en.wikipedia "Results by province" table)
as prevGebiete + prevNational with baseBlend: 0.75: the projection reads
0.75 * 2025 + 0.25 * 2023 geography, result views stay pure 2025. NSC
(12.9% in 2023, gone from the 2025 field) and 50PLUS (inside Others in
2023) have no prev slot and hold their 2025 baseline (50PLUS) or are
simply absent (NSC).

Idempotent: rerunning replaces the block. Usage:
python scraper/build_nl_base.py [--force]
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
URL = "https://en.wikipedia.org/wiki/2023_Dutch_general_election"

PROV = {
    "Drenthe": "drenthe", "Flevoland": "flevoland", "Friesland": "friesland",
    "Gelderland": "gelderland", "Groningen": "groningen",
    "Limburg": "limburg", "North Brabant": "north_brabant",
    "North Holland": "north_holland", "Overijssel": "overijssel",
    "South Holland": "south_holland", "Utrecht": "utrecht",
    "Zeeland": "zeeland",
}
# header token (letters only, lower) -> config code; GL-PvdA -> pro (the
# same fold the 2025 build uses); NSC has no config slot
COLS = {"pvv": "pvv", "glpvda": "pro", "vvd": "vvd", "d66": "d66",
        "bbb": "bbb", "cda": "cda", "sp": "sp", "denk": "denk",
        "fvd": "fvd", "pvdd": "pvdd", "sgp": "sgp", "cu": "cu",
        "volt": "volt", "ja21": "ja21"}
# 2023 national result (official, % of valid) for the mapped parties
NAT = {"pvv": 23.49, "pro": 15.75, "vvd": 15.24, "d66": 6.29, "bbb": 4.65,
       "cda": 3.31, "sp": 3.15, "denk": 2.05, "pvdd": 2.25, "fvd": 2.23,
       "sgp": 2.08, "cu": 2.04, "volt": 1.71, "ja21": 0.68}


def num(s):
    m = re.match(r"(\d+(?:\.\d+)?)", (s or "").strip())
    return float(m.group(1)) if m else None


def main():
    force = "--force" in sys.argv
    os.makedirs(CACHE, exist_ok=True)
    p = os.path.join(CACHE, "nl2023_article.html")
    if force or not os.path.isfile(p):
        r = requests.get(URL, headers=H, timeout=300)
        r.raise_for_status()
        open(p, "wb").write(r.content)
    soup = BeautifulSoup(open(p, encoding="utf8").read(), "lxml")

    out = {}
    for t in soup.find_all("table"):
        rows = t.find_all("tr")
        if len(rows) < 10:
            continue
        grid, _ = expand_grid(t)
        hdr = [c.strip() for c in grid[0]]
        if hdr[:2] != ["Province", "PVV"] or "JA21" not in hdr:
            continue
        cols = {}
        for ci, h in enumerate(hdr):
            tok = re.sub(r"[^a-z0-9]", "", h.lower())
            # headers may carry a footnote letter ("D66a", "JA21b")
            if tok not in COLS and tok[:-1] in COLS:
                tok = tok[:-1]
            if tok in COLS:
                cols[ci] = COLS[tok]
        assert len(cols) >= 12, hdr
        for row in grid[1:]:
            if not row:
                continue
            key = PROV.get(row[0].strip())
            if not key:
                continue
            shares = {}
            for ci, code in cols.items():
                v = num(row[ci]) if ci < len(row) else None
                if v is not None:
                    shares[code] = v
            out[key] = shares
        break
    assert len(out) == 12, f"expected 12 provinces, got {len(out)}"
    print("provinces:", len(out))
    print("drenthe:", out["drenthe"])
    print("utrecht:", out["utrecht"])

    text = open(CONFIG, encoding="utf8").read()
    i = text.find("\n  netherlands: {")
    assert i >= 0, "netherlands block not found"
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
    seg = re.sub(r"\n          // previous-election base \(22 Nov 2023.*?"
                 r"baseBlend: [\d.]+,", "", seg, flags=re.S)
    m = re.search(r"national2021: \{[^}]*\}", seg, re.S)
    assert m, "netherlands national2021 not found"
    jd = json.dumps
    block = (
        ",\n          // previous-election base (22 Nov 2023, en.wikipedia\n"
        "          // per-province table; scraper/build_nl_base.py): the\n"
        "          // projection blends 0.75 * 2025 + 0.25 * 2023 geography,\n"
        "          // result views stay pure 2025. GL-PvdA -> PRO (same fold\n"
        "          // as the 2025 build); NSC (12.9% in 2023) is gone from\n"
        "          // the field, 50PLUS sits inside Others in 2023 and both\n"
        "          // hold their 2025 baseline.\n"
        "          prevGebiete: " + jd(out, ensure_ascii=False) + ",\n"
        "          prevNational: " + jd(NAT) + ",\n"
        "          baseBlend: 0.75"
    )
    seg = seg[:m.end()] + block + seg[m.end():]
    text = text[:i] + seg + text[j:]
    open(CONFIG, "w", encoding="utf8", newline="").write(text)
    print("patched config.js (netherlands prevGebiete + baseBlend 0.75)")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Patch the france map block with the 2022 runoff baselines.

Source: the 2022 presidential election article's per-department runoff
table (Department | Macron votes/% | Le Pen votes/%), mapped to the
department codes with the same name table the map builder uses. Keyed
{camp, lepen} - the app remaps 'camp' onto whichever president's-camp
candidate is in the current runoff pairing at render time.

Usage: python scraper/build_fr_runoff.py
"""

import json
import os
import re
import sys
import unicodedata
from pathlib import Path

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent))
from scrape_spain import expand_grid
from fr_departments import NAME_CODE
from build_france_map import fold

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "js" / "config.js"
URL = "https://en.wikipedia.org/wiki/2022_French_presidential_election"


def main():
    r = requests.get(URL, headers={"User-Agent": "600-poll-scraper/1.0"},
                     timeout=180)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "lxml")
    table = None
    for tb in soup.find_all("table"):
        head = tb.get_text(" ", strip=True)[:120]
        if "Department" not in head[:40] or "Emmanuel Macron" not in head \
                or "Marine Le Pen" not in head or len(tb.find_all("tr")) < 100:
            continue
        cells0 = tb.find_all("tr")[0].find_all(["td", "th"])
        if len(cells0) > 6:
            continue  # the first-round table (many parties), not the runoff
        table = tb
        break
    assert table is not None, "runoff table not found"
    grid, _ = expand_grid(table)

    t = CONFIG.read_text(encoding="utf8")
    name_code = {fold(n): c for n, c in NAME_CODE.items()}
    assert len(name_code) == 96, len(name_code)

    runoff = {}
    total = None
    for row in grid[2:]:
        if len(row) < 5:
            continue
        name = str(row[0]).strip()
        if name == "Total":
            total = (num(row[2]), num(row[4]))
            continue
        code = name_code.get(fold(name))
        if not code:
            continue
        runoff[code] = {"camp": num(row[2]), "lepen": num(row[4])}
    assert len(runoff) == 96, len(runoff)
    assert total and abs(total[0] - 58.55) < 0.05, total
    print("runoff: 96 departments (national %.2f / %.2f)" % total)

    block = json.dumps(runoff, ensure_ascii=False, sort_keys=True)
    nat = '{"camp": 58.55, "lepen": 41.45}'
    anchor = "      resultMerge:"
    k = t.find(anchor, t.find("  france: {"))
    assert k > 0
    insert = ("      // 2022 runoff baselines per department (Macron vs Le Pen;\n"
              "      // 'camp' is remapped onto the current pairing's camp\n"
              "      // candidate at render time)\n"
              "      runoff2022: " + block + ",\n"
              "      nationalRunoff: " + nat + ",\n")
    t = t[:k] + insert + t[k:]
    CONFIG.write_text(t, encoding="utf8")
    print("patched js/config.js (runoff2022 + nationalRunoff)")


def num(text):
    m = re.search(r"[\d.]+", str(text).replace(",", ""))
    return float(m.group(0)) if m else None


if __name__ == "__main__":
    main()

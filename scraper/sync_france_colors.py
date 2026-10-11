#!/usr/bin/env python3
"""Sync the France presidential candidate colors from Wikipedia.

The French polling tables carry the party color of every candidate in a
header row right under the name row (the first-round tables with vertical
headers); the cells align by column. This walks every first-round table's
header pair, builds name -> color, maps the names to the config keys and
patches the france block's party colors in js/config.js.

Usage: python scraper/sync_france_colors.py [--apply]
"""

import re
import sys
from pathlib import Path

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent))
from scrape_france import NAME_MAP, WIKI_URL, expand_grid, map_candidate

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "js" / "config.js"


def collect_colors():
    r = requests.get(WIKI_URL,
                     headers={"User-Agent": "600-poll-scraper/1.0"},
                     timeout=180)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "lxml")
    colors = {}
    h2 = ""
    for el in soup.find_all(["h2", "table"]):
        if el.name == "h2":
            h2 = el.get_text(strip=True)
            continue
        # the color rows live in the First round tables; the scenario
        # sections (Bardella runs / generic / 2022 re-run) gray candidates
        # out and must not leak in
        if h2 != "First round":
            continue
        if "wikitable" not in (el.get("class") or []):
            continue
        trs = el.find_all("tr")
        if len(trs) < 3:
            continue
        for ri in range(min(3, len(trs) - 1)):
            grid, _ = expand_grid(el)
            if ri + 1 >= len(grid):
                break
            names = grid[ri]
            # walk rows 0..ri+1 with explicit rowspan coverage so the color
            # row's cells land on the same columns as the names (the meta
            # columns are rowspan'd across the header)
            style_cols = {}
            covered = {}
            for rr in range(ri + 2):
                col = i = 0
                cells = trs[rr].find_all(["td", "th"])
                while i < len(cells):
                    while covered.get(col, -1) >= rr:
                        col += 1
                    c = cells[i]
                    cs = int(re.match(r"\d+", c.get("colspan") or "1").group())
                    rs = int(re.match(r"\d+", c.get("rowspan") or "1").group())
                    if rr == ri + 1:
                        m = re.search(r"background:\s*(#[0-9A-Fa-f]{6})",
                                      c.get("style") or "")
                        if m:
                            style_cols[col] = m.group(1)
                    for k in range(cs):
                        if rs > 1:
                            covered[col + k] = rr + rs - 1
                    col += cs
                    i += 1
            hits = 0
            for ci in range(len(names)):
                key = map_candidate(str(names[ci]))
                if key and ci in style_cols:
                    colors.setdefault(key, style_cols[ci])
                    hits += 1
            if hits >= 8:
                break
    return colors


def main():
    apply = "--apply" in sys.argv
    colors = collect_colors()
    print("wiki colors found:", len(colors))
    for k in sorted(colors):
        print("  %-12s %s" % (k, colors[k]))
    if not apply:
        print("(dry run; pass --apply to patch js/config.js)")
        return
    t = CONFIG.read_text(encoding="utf8")
    i = t.find("  france: {")
    depth = 0
    e = t.index("{", i)
    j = e
    while j < len(t):
        if t[j] == "{":
            depth += 1
        elif t[j] == "}":
            depth -= 1
            if depth == 0:
                break
        j += 1
    block = t[i:j + 1]
    patched = 0
    for key, color in colors.items():
        m = re.search(r"(\n      %s: \{\n(?:        [^\n]*\n)*?        color: \")(#[0-9A-Fa-f]{6})(\")"
                      % re.escape(key), block)
        if not m:
            print("  !! no color slot for", key)
            continue
        if m.group(2).upper() == color.upper():
            continue
        block = block[:m.start(2)] + color + block[m.end(2):]
        patched += 1
    t = t[:i] + block + t[j + 1:]
    CONFIG.write_text(t, encoding="utf8")
    print("patched %d colors in js/config.js" % patched)


if __name__ == "__main__":
    main()

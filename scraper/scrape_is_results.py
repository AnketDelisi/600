#!/usr/bin/env python3
"""Scrape the 2024 Icelandic parliamentary election baselines.

Source: the en-wiki 2024 election article - the national results table
(party / votes / % / seats) and the per-constituency vote-percentage table
(6 constituencies x 9 parties). District/leveling seat counts are fixed by
law (Althingi 2024 election report: RN 9+2, RS 9+2, SW 12+2, NW 6+1,
NE 9+1, S 9+1 = 54 district + 9 leveling = 63) and validated against the
article's per-constituency seat table.

Writes data/is/results.json.
"""

import json
import re
import sys
from pathlib import Path

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent))
from scrape_spain import expand_grid

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "is" / "results.json"
URL = "https://en.wikipedia.org/wiki/2024_Icelandic_parliamentary_election"

# party names in the results tables -> config keys
NAME_MAP = {
    "social democratic alliance": "s", "independence party": "d",
    "vi\u00f0reisn": "c", "people's party": "f", "centre party": "m",
    "progressive party": "b", "socialist party": "j",
    "pirate party": "p", "left-green movement": "v",
}
CONST_MAP = {
    "Reykjav\u00edk North": "rn", "Reykjav\u00edk South": "rs",
    "Southwest": "sw", "Northwest": "nw", "Northeast": "ne",
    "South": "s",
}
DISTRICT_SEATS = {"rn": 9, "rs": 9, "sw": 12, "nw": 6, "ne": 9, "s": 9}
LEVELING_SEATS = {"rn": 2, "rs": 2, "sw": 2, "nw": 1, "ne": 1, "s": 1}
TOTAL_SEATS = {"rn": 11, "rs": 11, "sw": 14, "nw": 7, "ne": 10, "s": 10}


def num(text):
    m = re.search(r"[\d.]+", str(text).replace(",", ""))
    return float(m.group(0)) if m else None


def main():
    r = requests.get(URL, headers={"User-Agent": "600-poll-scraper/1.0"},
                     timeout=180)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "lxml")

    # national results
    nat_shares, nat_seats = {}, {}
    for tb in soup.find_all("table"):
        head = tb.get_text(" ", strip=True)[:40]
        if head.startswith("Party") and "Votes" in head and \
                "Seats" in head:
            grid, _ = expand_grid(tb)
            for row in grid:
                if len(row) < 5:
                    continue
                name = str(row[1]).strip().lower()
                key = NAME_MAP.get(name)
                if not key:
                    continue
                pct = num(row[3])
                seats = num(row[4])
                if pct is not None:
                    nat_shares[key] = pct
                if seats is not None:
                    nat_seats[key] = int(seats)
            break
    assert nat_shares.get("s") == 20.75, nat_shares
    assert sum(nat_seats.values()) == 63, nat_seats
    print("national:", nat_shares, nat_seats)

    # per-constituency percentages
    districts = {}
    for tb in soup.find_all("table"):
        head = tb.get_text(" ", strip=True)[:60]
        if "Constituency" not in head:
            continue
        grid, _ = expand_grid(tb)
        if not grid or len(grid[0]) != 10:
            continue
        got = {}
        for row in grid[2:]:
            name = str(row[0]).strip()
            key = CONST_MAP.get(name)
            if not key:
                continue
            shares = {}
            for ci, p in ((1, "s"), (2, "d"), (3, "c"), (4, "f"), (5, "m"),
                          (6, "b"), (7, "j"), (8, "p"), (9, "v")):
                v = num(row[ci])
                if v is not None:
                    shares[p] = v
            got[key] = {"name": name, "shares": shares}
        if len(got) == 6:
            districts = got
            break
    assert len(districts) == 6, sorted(districts)
    # validate against the per-constituency seat table
    for tb in soup.find_all("table"):
        head = tb.get_text(" ", strip=True)[:60]
        if "Constituency" in head and "Total" in head:
            grid, _ = expand_grid(tb)
            for row in grid[2:]:
                key = CONST_MAP.get(str(row[0]).strip())
                if key:
                    total = num(row[-1])
                    assert total == TOTAL_SEATS[key], (key, total)
            break
    print("validated: per-constituency totals 11/11/14/7/10/10")

    out = {
        "country": "is",
        "source": "en.wikipedia (2024 election); district/leveling seat "
                  "counts from the Althingi 2024 election report",
        "districts": districts,
        "national": {"shares": nat_shares, "seats": nat_seats},
        "seats": {"district": DISTRICT_SEATS, "leveling": LEVELING_SEATS},
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1),
                   encoding="utf8")
    print("wrote", OUT)


if __name__ == "__main__":
    main()

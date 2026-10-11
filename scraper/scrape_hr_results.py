#!/usr/bin/env python3
"""Scrape the 2024 Croatian parliamentary election baselines.

Source: the en-wiki 2024 election article's per-constituency results table
(Constituency | HDZ % / seats | Rivers of Justice % / seats | DP | Most |
Možemo | Our Croatia | Focus-Republic; districts I-X plus the XI diaspora).
The 2024 lists were coalitions; each coalition's share is attributed to its
lead party key (HDZ -> hdz, Rivers of Justice -> sdp, DP-led -> dp, Most-HS ->
most, Možemo -> mozemo, Focus-Republic -> fokus, Our Croatia -> nps in III /
ids in VIII, where its two member groups won). The 8 minority seats are not
modelled (reservedSeats other: 8 in the config).

Writes data/hr/results.json.
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
OUT = ROOT / "data" / "hr" / "results.json"
URL = "https://en.wikipedia.org/wiki/2024_Croatian_parliamentary_election"

# column index -> (key, is_seats); the table repeats (% , Seats) per group
GROUPS = [
    (1, "hdz"), (3, "sdp"), (5, "dp"), (7, "most"), (9, "mozemo"),
    (11, "ourcroatia"), (13, "fokus"),
]
OURCROATIA_BY_DISTRICT = {"iii": "nps", "viii": "ids"}


def num(text):
    m = re.search(r"[\d.]+", str(text).replace(",", ""))
    return float(m.group(0)) if m else None


def main():
    r = requests.get(URL, headers={"User-Agent": "600-poll-scraper/1.0"},
                     timeout=180)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "lxml")
    table = None
    for tb in soup.find_all("table"):
        head = tb.get_text(" ", strip=True)[:80]
        if head.startswith("Constituency") and "Rivers of Justice" in head:
            table = tb
            break
    assert table is not None, "per-constituency results table not found"
    grid, _ = expand_grid(table)

    districts = {}
    for row in grid:
        name = str(row[0]).strip().upper()
        if not re.match(r"^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI)$", name):
            continue
        key = name.lower()
        shares, seats = {}, {}
        for ci, gkey in GROUPS:
            pct = num(row[ci])
            seat = num(row[ci + 1]) if ci + 1 < len(row) else None
            gkey = OURCROATIA_BY_DISTRICT.get(key, gkey) \
                if gkey == "ourcroatia" else gkey
            if pct:
                shares[gkey] = pct
            if seat:
                seats[gkey] = int(seat)
        districts[key] = {"name": name, "shares": shares, "seats": seats}

    assert len(districts) == 11, sorted(districts)
    # validate: I-X elect 14 seats each, XI elects 3
    for key, d in districts.items():
        want = 3 if key == "xi" else 14
        assert sum(d["seats"].values()) == want, (key, d["seats"])
    # validate against the national summary table
    total_seats = {}
    for d in districts.values():
        for p, n in d["seats"].items():
            total_seats[p] = total_seats.get(p, 0) + n
    assert total_seats == {"hdz": 61, "sdp": 42, "dp": 14, "most": 11,
                           "mozemo": 10, "nps": 2, "ids": 2, "fokus": 1}, \
        total_seats
    print("validated: per-district seats sum to 61/42/14/11/10/2/2/1 "
          "(143 + 8 minorities = 151)")

    # national shares: seat-weighted from the Total row of the same table
    nat = {}
    for row in grid:
        if str(row[0]).strip() == "Total":
            for ci, gkey in GROUPS:
                pct = num(row[ci])
                if pct:
                    nat[gkey if gkey != "ourcroatia" else "nps"] = pct
            break
    assert nat.get("hdz") == 34.4, nat
    # Our Croatia's national share (3.5) is the sum of NPS (1.22, per the
    # national summary table) and IDS (2.25); keep them separate
    nat["nps"] = 1.22
    nat["ids"] = 2.25
    print("national shares:", nat)

    out = {
        "country": "hr",
        "source": "en.wikipedia (2024 election; coalitions mapped to lead "
                  "parties)",
        "districts": districts,
        "national": {"shares": nat, "seats": total_seats,
                     "minority": 8},
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1),
                   encoding="utf8")
    print("wrote", OUT)


if __name__ == "__main__":
    main()

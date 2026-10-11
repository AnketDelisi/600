#!/usr/bin/env python3
"""Scrape the 2026 Slovenian parliamentary election baselines.

Source: the en-wiki 2026 election article - the national results table
(party / votes / % / seats) and the per-constituency results table
(8 constituencies x GS / SDS / NSF / SD / Democrats / LV / Resni.ca /
Others, votes + %). Levica and Vesna ran as one list (LV); its share is
attributed to the Levica key (v anchored at 0). The 2 minority seats are
reservedSeats in the config.

Writes data/si/results.json.
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
OUT = ROOT / "data" / "si" / "results.json"
URL = "https://en.wikipedia.org/wiki/2026_Slovenian_parliamentary_election"

NAME_MAP = {
    "freedom movement": "gs", "slovenian democratic party": "sds",
    "nsi, sls, fokus": "nsf", "social democrats": "sd",
    "democrats": "dem", "levica and vesna": "l", "levica": "l",
    "resni.ca": "res", "prerod": "pvp", "pirate party": "pir",
    "slovenian national party": "sns", "we, socialists!": "mi",
}
CONST_MAP = {
    "Celje": "celje", "Kranj": "kranj",
    "Ljubljana Be\u017eigrad": "ljubljana_bezigrad",
    "Ljubljana Center": "ljubljana_center", "Maribor": "maribor",
    "Novo Mesto": "novo_mesto", "Postojna": "postojna", "Ptuj": "ptuj",
}


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
        head = tb.get_text(" ", strip=True)[:30]
        if head.startswith("Party") and "Votes" in head and \
                "Seats" in head:
            grid, _ = expand_grid(tb)
            for row in grid:
                if len(row) < 5:
                    continue
                key = NAME_MAP.get(str(row[1]).strip().lower())
                if not key:
                    continue
                pct = num(row[3])
                seats = num(row[4])
                if pct is not None:
                    nat_shares[key] = pct
                if seats is not None:
                    nat_seats[key] = int(seats)
            break
    assert nat_shares.get("gs") == 28.66, nat_shares
    assert sum(nat_seats.values()) == 88, nat_seats
    print("national:", nat_shares, nat_seats)

    # per-constituency results
    districts = {}
    for tb in soup.find_all("table"):
        head = tb.get_text(" ", strip=True)[:80]
        if not head.startswith("Constituency") or "Resni" not in head:
            continue
        grid, _ = expand_grid(tb)
        got = {}
        for row in grid:
            name = str(row[0]).strip()
            key = CONST_MAP.get(name)
            if not key:
                continue
            shares = {}
            for ci, p in ((1, "gs"), (3, "sds"), (5, "nsf"), (7, "sd"),
                          (9, "dem"), (11, "l"), (13, "res")):
                v = num(row[ci + 1]) if ci + 1 < len(row) else None
                if v is not None:
                    shares[p] = v
            got[key] = {"name": name, "shares": shares}
        if len(got) == 8:
            districts = got
            break
    assert len(districts) == 8, sorted(districts)
    for key, d in districts.items():
        assert d["shares"].get("gs"), key
    print("validated: 8 constituencies parsed")

    out = {
        "country": "si",
        "source": "en.wikipedia (2026 election, DVK figures)",
        "districts": districts,
        "national": {"shares": nat_shares, "seats": nat_seats,
                     "minority": 2},
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1),
                   encoding="utf8")
    print("wrote", OUT)


if __name__ == "__main__":
    main()

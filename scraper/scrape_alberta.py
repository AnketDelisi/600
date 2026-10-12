#!/usr/bin/env python3
"""Scrape Alberta provincial polls from the 32nd general election article.

The "Opinion polls" table: Pollster | Client | Dates conducted | Source |
UCP | NDP | GRN | TORY | LIB | WLC | WIP | RPA. Polls from the 2023
election onward only (the model projects the 2027 election); the
election rows are skipped. The table carries no sample column - n
defaults to 1000.

Output schema matches the other country scrapers (data/alberta/
polls.json).
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

WIKI_URL = "https://en.wikipedia.org/wiki/32nd_Alberta_general_election"
COUNTRY = "alberta"
CUTOFF = "2023-06-01"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / COUNTRY

MONTHS = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
          "jul": 7, "aug": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11,
          "dec": 12,
          "january": 1, "february": 2, "march": 3, "april": 4, "june": 6,
          "july": 7, "august": 8, "september": 9, "october": 10,
          "november": 11, "december": 12}
COLS = {"ucp": "ucp", "ndp": "ndp", "grn": "grn", "tory": "tory",
        "lib": "lib", "wlc": "wlc", "wip": "wip", "rpa": "rpa"}
MIN_PARTIES = 3


def expand_grid(table):
    rows = table.find_all("tr")
    grid = []
    live = {}
    for tr in rows:
        cells = tr.find_all(["td", "th"])
        out = []
        col = i = 0
        while i < len(cells):
            while col in live and live[col][0] > 0:
                out.append(live[col][1])
                live[col] = (live[col][0] - 1, live[col][1])
                col += 1
            c = cells[i]
            txt = " ".join(c.get_text(" ", strip=True).split())
            cs = int(c.get("colspan") or 1)
            rs = int(c.get("rowspan") or 1)
            for k in range(cs):
                out.append(txt)
                if rs > 1:
                    live[col + k] = (rs - 1, txt)
            col += cs
            i += 1
        while col in live and live[col][0] > 0:
            out.append(live[col][1])
            live[col] = (live[col][0] - 1, live[col][1])
            col += 1
        grid.append(out)
    return grid


def parse_date(text):
    """'Sep 8-21 2026' / 'Sep 4-7, 2026' / 'Aug 2026' -> end date."""
    t = re.sub(r"\[\s*\w+\s*\]", "", text or "").strip()
    m = re.match(r"([A-Za-z]+)\s+\d{1,2}\s*[–—-]\s*(\d{1,2}),?\s*(\d{4})", t)
    if m:
        mon = MONTHS.get(m.group(1).lower())
        if mon:
            return "%s-%02d-%02d" % (m.group(3), mon, int(m.group(2)))
    m = re.match(r"([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})", t)
    if m:
        mon = MONTHS.get(m.group(1).lower())
        if mon:
            return "%s-%02d-%02d" % (m.group(3), mon, int(m.group(2)))
    m = re.match(r"([A-Za-z]+),?\s+(\d{4})", t)
    if m:
        mon = MONTHS.get(m.group(1).lower())
        if mon:
            return "%s-%02d-01" % (m.group(2), mon)
    return None


def pct(s):
    m = re.search(r"(\d+(?:\.\d+)?)", (s or "").replace(",", ""))
    return float(m.group(1)) if m else None


def scrape():
    print(f"Fetching {WIKI_URL}...")
    resp = requests.get(WIKI_URL,
                        headers={"User-Agent": "600-poll-scraper/1.0"},
                        timeout=180)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    polls = []
    for tb in soup.find_all("table"):
        if "wikitable" not in (tb.get("class") or []):
            continue
        grid = expand_grid(tb)
        if len(grid) < 8:
            continue
        cand_col = {}
        for ri in range(min(2, len(grid))):
            for col, cell in enumerate(grid[ri]):
                tok = re.sub(r"[^a-z]", "", (cell or "").lower())
                if tok in COLS and col not in cand_col:
                    cand_col[col] = COLS[tok]
        if len(set(cand_col.values())) < MIN_PARTIES:
            continue
        for row in grid:
            if len(row) < 6:
                continue
            date = parse_date(row[2])
            if not date or date < CUTOFF:
                continue
            pollster = re.sub(r"\[\s*\w+\s*\]", "", row[0]).strip()
            if not pollster or len(pollster) < 3:
                continue
            if re.search(r"\b(election|result)\b", pollster, re.I):
                continue
            votes = {}
            for col, key in cand_col.items():
                v = pct(row[col]) if col < len(row) else None
                if v is not None:
                    votes[key] = v
            if len(votes) < MIN_PARTIES:
                continue
            polls.append({"pollster": pollster, "date": date, "votes": votes,
                          "n": 1000})
    seen, out = set(), []
    for p in sorted(polls, key=lambda x: x["date"], reverse=True):
        k = (p["pollster"], p["date"])
        if k in seen:
            continue
        seen.add(k)
        out.append(p)
    return out


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    polls = scrape()
    out = OUTPUT_DIR / "polls.json"
    out.write_text(json.dumps({
        "country": COUNTRY,
        "sources": [{"name": "Wikipedia", "url": WIKI_URL}],
        "scraped_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "poll_count": len(polls),
        "polls": polls,
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Scraped {len(polls)} polls -> {out}")
    if polls:
        print(f"Date range: {polls[-1]['date']} to {polls[0]['date']}")
        for p in polls[:5]:
            top = sorted(p["votes"].items(), key=lambda x: -x[1])[:4]
            print(f"  {p['date']} {p['pollster']:24s} "
                  f"{', '.join(f'{k}:{v}' for k, v in top)}")


if __name__ == "__main__":
    main()

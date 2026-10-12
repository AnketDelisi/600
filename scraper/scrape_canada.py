#!/usr/bin/env python3
"""Scrape Canada federal polls from the 46th general election article.

The "Opinion polls" table: Polling firm | Last date of polling | Link |
LPC | CPC | BQ | NDP | GPC | PPC | Others | MoE | Sample size | Method |
Lead. Polls from the 2025 election onward only; election rows are
skipped.

Output schema matches the other country scrapers (data/canada/polls.json).
"""

import json
import re
import sys
import os
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(__file__))
from scrape_spain import expand_grid

WIKI_URL = ("https://en.wikipedia.org/wiki/"
            "Opinion_polling_for_the_46th_Canadian_federal_election")
COUNTRY = "canada"
CUTOFF = "2025-05-01"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / COUNTRY

MONTHS = {"january": 1, "february": 2, "march": 3, "april": 4, "may": 5,
          "june": 6, "july": 7, "august": 8, "september": 9,
          "october": 10, "november": 11, "december": 12,
          "jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6, "jul": 7,
          "aug": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12}
COLS = {"lpc": "lpc", "cpc": "cpc", "bq": "bq", "ndp": "ndp", "gpc": "gpc",
        "ppc": "ppc", "others": "other"}
MIN_PARTIES = 3


def parse_date(text):
    """'October 3, 2026' / 'September 29 - October 3, 2026' -> end date."""
    t = re.sub(r"\[\s*[^\[\]]*\]", "", text or "").strip()
    m = re.match(r"([A-Za-z]+)\s+\d{1,2}\s*[\u2013\u2014-]\s*"
                 r"(?:([A-Za-z]+)\s+)?(\d{1,2}),?\s*(\d{4})", t)
    if m:
        mon = MONTHS.get((m.group(2) or m.group(1)).lower())
        if mon:
            return "%s-%02d-%02d" % (m.group(4), mon, int(m.group(3)))
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


def sample_n(s):
    m = re.search(r"(\d[\d,]*)", s or "")
    return int(m.group(1).replace(",", "")) if m else None


def scrape():
    print(f"Fetching {WIKI_URL}...")
    resp = requests.get(WIKI_URL,
                        headers={"User-Agent": "600-poll-scraper/1.0"},
                        timeout=300)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    polls = []
    for tb in soup.find_all("table"):
        if "wikitable" not in (tb.get("class") or []):
            continue
        if len(tb.find_all("tr")) < 100:
            continue
        grid, _ = expand_grid(tb)
        cand_col = {}
        for ri in range(min(2, len(grid))):
            for col, cell in enumerate(grid[ri]):
                tok = re.sub(r"[^a-z]", "", (cell or "").lower())
                if tok in COLS and col not in cand_col:
                    cand_col[col] = COLS[tok]
        if len(set(cand_col.values())) < MIN_PARTIES:
            continue
        date_col = None
        n_col = None
        for ri in range(min(2, len(grid))):
            for col, cell in enumerate(grid[ri]):
                tok = (cell or "").lower()
                if "last date" in tok and date_col is None:
                    date_col = col
                if "sample size" in tok and n_col is None:
                    n_col = col
        if date_col is None:
            continue
        for row in grid:
            if len(row) < date_col + 1:
                continue
            date = parse_date(row[date_col])
            if not date or date < CUTOFF:
                continue
            pollster = re.sub(r"\[\s*[^\[\]]*\]", "", row[0]).strip()
            if not pollster or len(pollster) < 3:
                continue
            if re.search(r"\b(election|result|by-election)\b", pollster,
                         re.I):
                continue
            votes = {}
            for col, key in cand_col.items():
                v = pct(row[col]) if col < len(row) else None
                if v is not None:
                    votes[key] = v
            if len(votes) < MIN_PARTIES:
                continue
            n = sample_n(row[n_col]) if n_col and n_col < len(row) else None
            polls.append({"pollster": pollster, "date": date, "votes": votes,
                          "n": n or 1000})
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
            print(f"  {p['date']} {p['pollster']:26s} "
                  f"{', '.join(f'{k}:{v}' for k, v in top)} n={p['n']}")


if __name__ == "__main__":
    main()

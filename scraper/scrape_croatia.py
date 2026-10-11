#!/usr/bin/env python3
"""Scrape Croatian parliamentary election opinion polls from en.wikipedia.

Polls are national party-support shares (%) for the next Sabor election
(the 2024 election was on 17 April 2024). The page carries one main polling
table (publication date | polling firm | sample | 17 party columns | Others |
Undecided | Lead); dates carry explicit years. The final row is the 2024
election result itself and is skipped. The 2024 parties ran in coalitions
(Rivers of Justice etc.) but the polls ask about the parties individually -
the model's keys are the individual parties.

Output schema matches the other country scrapers (data/hr/polls.json).
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from pollster_norm import canonicalize_polls
from scrape_spain import expand_grid

WIKI_URL = ("https://en.wikipedia.org/wiki/"
            "Opinion_polling_for_the_next_Croatian_parliamentary_election")
COUNTRY = "hr"
CUTOFF = "2024-04-18"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / COUNTRY

MONTHS = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
          "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12}

TITLE_MAP = {
    "croatian democratic union": "hdz",
    "social democratic party of croatia": "sdp",
    "homeland movement (croatia)": "dp",
    "home and national rally": "domino",
    "law and justice (croatia)": "pip",
    "we can! (croatia)": "mozemo",
    "the bridge (croatia)": "most",
    "croatian sovereignists": "hs",
    "focus (croatian political party)": "fokus",
    "istrian democratic assembly": "ids",
    "independent platform of the north": "nps",
    "workers' front (croatia)": "rf",
    "centre (croatian political party)": "centar",
    "croatian peasant party": "hss",
    "croatian party of pensioners": "hsu",
    "croatian people's party \u2013 liberal democrats": "hns",
    "drito (political party)": "drito",
}
MIN_PARTIES = 3


def parse_date(text):
    text = re.sub(r"\[\d+\]", "", text or "").strip()
    for ch in "\u2013\u2014\u2015":
        text = text.replace(ch, "-")
    dates = re.findall(r"(\d{1,2})\s*([A-Za-z]+)\s+(\d{4})", text)
    if dates:
        day, mon_name, year = dates[-1]
        mon = MONTHS.get(mon_name.lower()[:3])
        if mon:
            try:
                return "%04d-%02d-%02d" % (int(year), mon, int(day))
            except ValueError:
                return None
    # day-month without a year in the cell: month+year only
    m = re.findall(r"([A-Za-z]+)\s+(\d{4})", text)
    if m:
        mon = MONTHS.get(m[-1][0].lower()[:3])
        if mon:
            return "%04d-%02d-15" % (int(m[-1][1]), mon)
    return None


def parse_share(text):
    text = re.sub(r"\[\d+\]", "", text or "").strip()
    m = re.match(r"(\d+(?:[.,]\d+)?)", text)
    if not m:
        return None
    v = float(m.group(1).replace(",", "."))
    return v if 0 <= v <= 100 else None


def parse_sample(text):
    m = re.match(r"\s*(\d[\d,\s]*)", re.sub(r"\[\d+\]", "", text or ""))
    if not m:
        return 0
    digits = re.sub(r"[^\d]", "", m.group(1))
    return int(digits) if digits and 100 <= int(digits) <= 100000 else 0


def party_of_cell(cell):
    a = cell.find("a")
    if a:
        title = (a.get("title") or "").strip().lower()
        if title in TITLE_MAP:
            return TITLE_MAP[title]
    return None


def header_cols(table, n_rows=3):
    cols = {}
    live = {}
    for tr in table.find_all("tr")[:n_rows]:
        cells = tr.find_all(["td", "th"])
        col, i = 0, 0
        while i < len(cells):
            while col in live and live[col] > 0:
                col += 1
            c = cells[i]
            cs = int(re.match(r"\d+", c.get("colspan") or "1").group())
            rs = int(re.match(r"\d+", c.get("rowspan") or "1").group())
            key = party_of_cell(c)
            if key and col not in cols:
                cols[col] = key
            for k in range(cs):
                if rs > 1:
                    live[col + k] = rs - 1
            col += cs
            i += 1
        for k in list(live):
            live[k] -= 1
            if live[k] <= 0:
                del live[k]
    return cols


def scrape():
    print(f"Fetching {WIKI_URL}...")
    resp = requests.get(WIKI_URL,
                        headers={"User-Agent": "600-poll-scraper/1.0"},
                        timeout=180)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    table = None
    for tb in soup.find_all("table"):
        if len(tb.find_all("tr")) > 50:
            table = tb
            break
    assert table is not None, "polling table not found"
    cols = header_cols(table)
    assert sum(1 for v in cols.values() if v) >= 8, cols
    grid, _ = expand_grid(table)

    polls, seen = [], set()
    for ri in range(2, len(grid)):
        texts = grid[ri]
        if len(texts) < 10:
            continue
        date = parse_date(texts[0] if texts else "")
        if not date or date < CUTOFF:
            continue
        pollster = re.sub(r"\[\s*[^\]]*\s*\]", "", texts[1]).strip()
        if not pollster or len(pollster) < 3:
            continue
        low = pollster.lower()
        if any(w in low for w in ("election", "result", "turnout")):
            continue
        n = parse_sample(texts[2] if len(texts) > 2 else "")
        votes = {}
        for i in range(len(texts)):
            key = cols.get(i)
            if not key:
                continue
            v = parse_share(texts[i])
            if v is not None:
                votes[key] = v
        if len(votes) < MIN_PARTIES:
            continue
        sig = (pollster, date)
        if sig in seen:
            continue
        seen.add(sig)
        polls.append({
            "pollster": pollster,
            "date": date,
            "n": n,
            "country": COUNTRY,
            "source": "Wikipedia",
            "source_url": WIKI_URL,
            "votes": votes,
        })
    polls.sort(key=lambda p: (p["date"], p["pollster"]))
    polls = canonicalize_polls(polls)
    return polls


def main():
    polls = scrape()
    print(f"Parsed {len(polls)} polls "
          f"(latest: {polls[-1]['date'] if polls else '-'})")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out = {
        "country": COUNTRY,
        "source": "Wikipedia",
        "source_url": WIKI_URL,
        "scraped_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "poll_count": len(polls),
        "polls": polls,
    }
    path = OUTPUT_DIR / "polls.json"
    path.write_text(json.dumps(out, ensure_ascii=False, indent=1),
                    encoding="utf8")
    print(f"Wrote {path}")


if __name__ == "__main__":
    main()

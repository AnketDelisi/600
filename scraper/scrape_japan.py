#!/usr/bin/env python3
"""Scrape Japanese general election opinion polls from en.wikipedia.

Polls are party support shares (%) for the next general election (after the
8 Feb 2026 snap election: LDP 316 seats). The page carries two party tables
(90 + 10 rows) whose columns are identified from the header links; the
fieldwork cells carry no year - it comes from the section heading above each
table. Others / No party / Undecided / Lead columns are skipped (the shares
are raw party support, so they sum well below 100).

Output schema matches the other country scrapers (data/jp/polls.json).
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
            "Opinion_polling_for_the_next_Japanese_general_election")
COUNTRY = "jp"
CUTOFF = "2026-02-09"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / COUNTRY

MONTHS = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
          "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12}

TITLE_MAP = {
    "liberal democratic party (japan)": "ldp",
    "centrist reform alliance": "cra",
    "centrist reform party": "cra",   # the alliance became a party in 2026
    "democratic reform party (japan, 2026)": "cra",  # ... renamed DRP, Sep 2026
    "japan innovation party": "ishin",
    "democratic party for the people": "dpfp",
    "sanseit\u014d": "sansei",
    "team mirai": "mirai",
    "japanese communist party": "jcp",
    "reiwa shinsengumi": "reiwa",
    "party of life (japan)": "reiwa",   # Reiwa Shinsengumi renamed in 2026
    "constitutional democratic party of japan": "cdp",
    "komeito": "komei",
    "conservative party of japan": "cpj",
    "social democratic party (japan)": "sdp",
}
MIN_PARTIES = 3


def parse_date(text, year):
    text = re.sub(r"\[\d+\]", "", text or "").strip()
    for ch in "\u2013\u2014\u2015\u2212":
        text = text.replace(ch, "-")
    dates = re.findall(r"(\d{1,2})\s*([A-Za-z]+)", text)
    if not dates:
        mon_m = re.search(r"([A-Za-z]{3,})", text)
        mon = MONTHS.get(mon_m.group(1).lower()[:3]) if mon_m else None
        if not mon:
            return None
        return datetime(year, mon, 15).strftime("%Y-%m-%d")
    day, mon_name = dates[-1]
    mon = MONTHS.get(mon_name.lower()[:3])
    if not mon:
        return None
    try:
        return datetime(year, mon, int(day)).strftime("%Y-%m-%d")
    except ValueError:
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


def header_cols(table, n_rows=2):
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
                        timeout=120)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    polls, seen = [], set()
    year = None
    body = soup.find("div", {"id": "mw-content-text"}) or soup
    for el in body.find_all(["h3", "table"]):
        if el.name == "h3":
            m = re.match(r"\s*(20\d{2})\s*$", el.get_text(" ", strip=True))
            if m:
                year = int(m.group(1))
            continue
        if "wikitable" not in (el.get("class") or []):
            continue
        rows = el.find_all("tr")
        if len(rows) < 5 or not year:
            continue
        cols = header_cols(el)
        if sum(1 for v in cols.values() if v) < MIN_PARTIES:
            continue
        grid, _ = expand_grid(el)
        for ri in range(2, len(grid)):
            texts = grid[ri]
            if len(texts) < 6:
                continue
            date = parse_date(texts[0] if texts else "", year)
            if not date or date < CUTOFF:
                continue
            pollster = re.sub(r"\[\s*[^\]]*\s*\]", "",
                              texts[1] if len(texts) > 1 else "").strip()
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

#!/usr/bin/env python3
"""Scrape Danish general election opinion polls from en.wikipedia.

Polls are national vote shares (%) for the next Folketing election (the 2026
election was on 24 March 2026: S 38 seats, SF 20, V 18, LA 16, DF 16, M 14,
KF 13, EL 11, RV 10, DD 10, ALT 5, BP 4 of the 175 Danish seats, plus 4
North Atlantic mandates). The polling table lives on "Next Danish general
election" (the "Opinion polling for the next..." title redirects there): the
party columns carry links whose title attributes name the party, and each
cell holds "<pct> <projected seats>" - only the share is taken. The five
bloc columns (Gov/Sup/Opp/Red/Blue) and Others are skipped.

Output schema matches the other country scrapers (data/dk/polls.json).
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
            "Next_Danish_general_election")
COUNTRY = "dk"
CUTOFF = "2026-03-25"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / COUNTRY

MONTHS = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
          "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12}

TITLE_MAP = {
    "social democrats (denmark)": "s",
    "green left (denmark)": "sf",
    "venstre (denmark)": "v",
    "liberal alliance (denmark)": "la",
    "danish people's party": "df",
    "moderates (denmark)": "m",
    "conservative people's party (denmark)": "kf",
    "red\u2013green alliance (denmark)": "el",
    "danish social liberal party": "rv",
    "denmark democrats": "dd",
    "the alternative (denmark)": "alt",
    "citizens' party (denmark)": "bp",
}
MIN_PARTIES = 3


def parse_date(text):
    text = re.sub(r"\[\d+\]", "", text or "").strip()
    year_m = re.search(r"\b(20\d{2})\b", text)
    if not year_m:
        return None
    for ch in "\u2013\u2014\u2015":
        text = text.replace(ch, "-")
    dates = re.findall(r"(\d{1,2})\s*([A-Za-z]+)", text)
    if not dates:
        mon_m = re.search(r"([A-Za-z]{3,})", text)
        mon = MONTHS.get(mon_m.group(1).lower()[:3]) if mon_m else None
        if not mon:
            return None
        return datetime(int(year_m.group(1)), mon, 15).strftime("%Y-%m-%d")
    day, mon_name = dates[-1]
    mon = MONTHS.get(mon_name.lower()[:3])
    if not mon:
        return None
    try:
        return datetime(int(year_m.group(1)), mon, int(day)).strftime("%Y-%m-%d")
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


def header_cols(table):
    """Party key per grid column, walking the three header rows with their
    colspans/rowspans (the group labels span 3/13/5 columns)."""
    cols = {}
    live = {}
    for tr in table.find_all("tr")[:3]:
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
    return cols


def scrape():
    print(f"Fetching {WIKI_URL}...")
    resp = requests.get(WIKI_URL,
                        headers={"User-Agent": "600-poll-scraper/1.0"},
                        timeout=60)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    polls, seen = [], set()
    for table in soup.find_all("table"):
        if "wikitable" not in (table.get("class") or []):
            continue
        rows = table.find_all("tr")
        if len(rows) < 8:
            continue
        # the party columns are identified from the header links; the header
        # spans three rows (group labels + names), so walk them with spans
        cols = header_cols(table)
        if sum(1 for v in cols.values() if v) < MIN_PARTIES:
            continue
        grid, _ = expand_grid(table)
        # the data rows start after the three header rows
        for ri in range(3, len(grid)):
            texts = grid[ri]
            if len(texts) < 6:
                continue
            date = parse_date(texts[1] if len(texts) > 1 else "")
            if not date or date < CUTOFF:
                continue
            pollster = re.sub(r"\[\s*[^\]]*\s*\]", "", texts[0]).strip()
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

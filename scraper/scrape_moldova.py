#!/usr/bin/env python3
"""Scrape Moldovan parliamentary election opinion polls from en.wikipedia.

Polls are national vote shares (%) for the next parliamentary election (the
2025 election was on 28 September 2025: PAS 55 seats, BEP 26, Alternative 8,
PN 6, PPDA 6). The polling table's party columns carry links whose title
attribute names the party (PAS, PSRM, PCRM, PVM, PRIM, MAN, PDCM, PAC-CC,
PN, PPDA, PSDE); CUB, LOC, Together, PNM, Others and Lead are skipped, and
the historical "2025 parliamentary election" row is excluded via the
'election' pollster filter.

Output schema matches the other country scrapers (data/md/polls.json).
"""

import json
import re
from calendar import monthrange
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from pollster_norm import canonicalize_polls
from scrape_spain import expand_grid

WIKI_URL = ("https://en.wikipedia.org/wiki/"
            "Next_Moldovan_parliamentary_election")
COUNTRY = "md"
CUTOFF = "2025-09-29"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / COUNTRY

MONTHS = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
          "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12}

TEXT_MAP = {"pas": "pas", "psrm": "psrm", "pcrm": "pcrm", "pvm": "pvm",
            "prim": "prim", "man": "man", "pdcm": "pdcm", "pac\u2013cc": "pacc",
            "pac-cc": "pacc", "pn": "pn", "ppda": "ppda", "psde": "psde"}
MIN_PARTIES = 3


def parse_date(text):
    text = re.sub(r"\[\d+\]", "", text or "").strip()
    year_m = re.search(r"\b(20\d{2})\b", text)
    if not year_m:
        return None
    for ch in "\u2013\u2014\u2015":
        text = text.replace(ch, "-")
    dates = re.findall(r"(\d{1,2})\s*([A-Za-z\u0102\u00C2\u00CE\u0218\u021A\u0103\u00E2\u00EE\u0219\u021B]+)", text)
    if not dates:
        # month-only fieldwork ("May 2026"): mid-month default
        mon_m = re.search(r"([A-Za-z]{3,})", text)
        mon = MONTHS.get(mon_m.group(1).lower()[:3]) if mon_m else None
        if not mon:
            return None
        year = int(year_m.group(1))
        return datetime(year, mon, 15).strftime("%Y-%m-%d")
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
        # colspan-aware expansion: the IMAS rows merge un-polled party cells
        # into one spanning "–" cell, and report the dissolved Alternative
        # bloc's components (MAN/PDCM/PAC-CC) as one combined value - split
        # the span equally between the columns it covers
        grid, metas = expand_grid(table)
        cols = {i: TEXT_MAP.get(t.strip().lower())
                for i, t in enumerate(grid[0])}
        if sum(1 for v in cols.values() if v) < MIN_PARTIES:
            continue
        for ri in range(1, len(grid)):
            texts = grid[ri]
            if len(texts) < 6:
                continue
            date = parse_date(texts[1] if len(texts) > 1 else "")
            if not date or date < CUTOFF:
                continue
            pollster = re.sub(r"\[\s*[\w\d]+\s*\]", "", texts[0]).strip()
            if not pollster or len(pollster) < 3:
                continue
            low = pollster.lower()
            if "election" in low or "result" in low or "turnout" in low:
                continue
            n = parse_sample(texts[2] if len(texts) > 2 else "")
            votes = {}
            for col, span, txt in metas[ri]:
                parts = [cols.get(c) for c in range(col, col + span)]
                parts = [p for p in parts if p]
                if not parts:
                    continue
                v = parse_share(txt)
                if v is None:
                    continue
                for p in parts:
                    votes[p] = round(votes.get(p, 0) + v / len(parts), 2)
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

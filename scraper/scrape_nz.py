#!/usr/bin/env python3
"""Scrape New Zealand election opinion polls from en.wikipedia.

The "Opinion polling for the 2026 New Zealand general election" article has
one main national table: Date | Polling organisation | Sample size | NAT |
LAB | GRN | ACT | NZF | TPM | OPP | Others | Lead (polls from the October
2023 election onward). Smaller tables (preferred PM, direction, seat
projections) do not match the party columns and are skipped.

Output schema matches the other country scrapers (data/nz/polls.json).
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from pollster_norm import canonicalize_polls

WIKI_URL = ("https://en.wikipedia.org/wiki/"
            "Opinion_polling_for_the_2026_New_Zealand_general_election")
COUNTRY = "nz"
CUTOFF = "2023-10-15"          # after the 14 October 2023 election
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / COUNTRY

POLLSTER_ALIAS = {}

MONTHS = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
          "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12}

ALT_MAP = {"nat": "nat", "lab": "lab", "grn": "grn", "act": "act",
           "nzf": "nzf", "tpm": "tpm", "opp": "opp"}
KNOWN = set(ALT_MAP.values())
MIN_PARTIES = 4


def expand_grid(table):
    rows = table.find_all("tr")
    grid, metas = [], []
    live = {}
    for tr in rows:
        cells = tr.find_all(["td", "th"])
        out, mrow = [], []
        col = i = 0
        while i < len(cells):
            while col in live and live[col][0] > 0:
                out.append(live[col][1])
                live[col][0] -= 1
                col += 1
            c = cells[i]
            txt = " ".join(c.get_text(" ", strip=True).split())
            cs = int(re.match(r"\d+", c.get("colspan") or "1").group())
            rs = int(re.match(r"\d+", c.get("rowspan") or "1").group())
            mrow.append((col, cs, txt))
            for k in range(cs):
                out.append(txt)
                if rs > 1:
                    live[col + k] = [rs - 1, txt]
            col += cs
            i += 1
        while col in live and live[col][0] > 0:
            out.append(live[col][1])
            live[col][0] -= 1
            col += 1
        grid.append(out)
        metas.append(mrow)
    return grid, metas


def map_header(txt):
    t = re.sub(r"\[[^\]]*\]", "", txt or "").strip().lower()
    return ALT_MAP.get(t)


def parse_date(text, ref_year=None):
    text = re.sub(r"\[\d+\]", "", text or "").strip()
    year_m = re.search(r"\b(20\d{2})\b", text)
    year = int(year_m.group(1)) if year_m else ref_year
    if not year:
        return None, None
    for ch in "\u2013\u2014\u2015":
        text = text.replace(ch, "-")
    dates = re.findall(r"([A-Za-z]{3,})\s*(\d{1,2})", text)
    if not dates:
        dates = [(m, d) for d, m in
                 re.findall(r"(\d{1,2})\s*([A-Za-z]{3,})", text)]
    parsed = []
    for mon_name, day in dates:
        mon = MONTHS.get(mon_name.lower()[:3])
        if not mon:
            continue
        try:
            parsed.append(datetime(year, mon, int(day)).strftime("%Y-%m-%d"))
        except ValueError:
            pass
    if not parsed:
        return None, None
    return parsed[0], parsed[-1]


def parse_share(text):
    text = re.sub(r"\[[^\]]*\]", "", text or "").strip()
    m = re.match(r"(\d+(?:[.,]\d+)?)", text)
    if not m:
        return None
    return float(m.group(1).replace(",", "."))


def scrape_nz():
    print(f"Fetching {WIKI_URL}...")
    resp = requests.get(WIKI_URL,
                        headers={"User-Agent": "600-poll-scraper/1.0"},
                        timeout=120)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    polls, seen = [], set()
    for el in soup.find_all("table"):
        if "wikitable" not in (el.get("class") or []):
            continue
        rows = el.find_all("tr")
        if len(rows) < 40:
            continue
        head_txt = " ".join(rows[0].get_text(" ", strip=True).split())
        if "Polling organisation" not in head_txt:
            continue
        grid, metas = expand_grid(el)
        hdr = grid[0]
        col_map = {}
        sample_col = None
        for i, htxt in enumerate(hdr):
            key = map_header(htxt)
            if key:
                col_map[i] = key
            if re.search(r"sample", htxt, re.I):
                sample_col = i
        if sum(1 for k in col_map.values()) < MIN_PARTIES:
            continue
        print(f"  table: {len(rows)} rows, parties: {sorted(col_map.values())}")
        for ri in range(1, len(grid)):
            row = grid[ri]
            if len(row) < 6:
                continue
            start, date = parse_date(row[0])
            if not date or date < CUTOFF:
                continue
            pollster = re.sub(r"\[\s*[\w\d]+\s*\]", "", row[1])
            pollster = re.sub(r"\s+", " ", pollster).strip()
            if not pollster or len(pollster) < 3 or len(pollster) > 60:
                continue
            if "election" in pollster.lower():
                continue
            n = 0
            if sample_col is not None and sample_col < len(row):
                digits = re.sub(r"[^\d]", "", row[sample_col] or "")
                if digits:
                    n = int(digits)
            votes = {}
            for start_c, span, txt in metas[ri]:
                for i in range(start_c, min(start_c + span, len(row))):
                    if i in col_map:
                        share = parse_share(txt)
                        if share is not None:
                            votes[col_map[i]] = share
            if len(votes) < MIN_PARTIES:
                continue
            if not 60 <= sum(votes.values()) <= 110:
                continue
            key = (pollster.lower(), date)
            if key in seen:
                continue
            seen.add(key)
            polls.append({"pollster": pollster, "fieldwork_start": start,
                          "date": date, "n": n, "country": COUNTRY,
                          "source": "Wikipedia", "source_url": WIKI_URL,
                          "votes": votes})
    polls = canonicalize_polls(polls, POLLSTER_ALIAS)
    polls.sort(key=lambda p: p["date"], reverse=True)
    return polls


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    polls = scrape_nz()
    print(f"Scraped {len(polls)} polls")
    out = OUTPUT_DIR / "polls.json"
    out.write_text(json.dumps({
        "country": COUNTRY,
        "source": "Wikipedia",
        "source_url": WIKI_URL,
        "scraped_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "poll_count": len(polls),
        "polls": polls,
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {out}")
    if polls:
        pollsters = sorted(set(p["pollster"] for p in polls))
        print(f"Pollsters ({len(pollsters)}): {', '.join(pollsters[:14])}")
        print(f"Date range: {polls[-1]['date']} to {polls[0]['date']}")
        print("\nLatest 5:")
        for p in polls[:5]:
            top = sorted(p["votes"].items(), key=lambda x: -x[1])[:4]
            print(f"  {p['date']} {p['pollster']:22s} n={p['n']:<5d} "
                  f"{', '.join(f'{k}:{v}' for k, v in top)}")


if __name__ == "__main__":
    main()

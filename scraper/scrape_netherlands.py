#!/usr/bin/env python3
"""Scrape Dutch opinion polls from Wikipedia for the next Tweede Kamer election.

Dutch polls are reported as SEAT projections (of 150). Seat tables store raw
seat counts — no conversion to vote share. The site runs the whole pipeline
(averages, forecast, parliament) directly in seat space (seatBased mode), and
approximates vote shares for the province map when rendering the poll tab.

The Wikipedia page carries two identical-looking tables: the seat-projection
table (whole-number seats, sums to ~150) and the vote-share table (decimals or
%, sums to ~100). We only keep rows whose party values are pure integers after
footnote stripping — the seat table — and enforce a ~150 seat total, which
drops the % table entirely. Two non-poll rows are rejected explicitly: the
"2025 election" baseline row and a one-off row announcing Jesse Klaver's PRO
leadership (empty pollster / unparseable cells).
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

WIKI_URL = "https://en.wikipedia.org/wiki/Opinion_polling_for_the_next_Dutch_general_election"
COUNTRY = "netherlands"
SEATS = 150
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / COUNTRY

MONTHS = {"jan":1,"feb":2,"mar":3,"apr":4,"may":5,"jun":6,"jul":7,"aug":8,"sep":9,"oct":10,"nov":11,"dec":12}

# Normalized poll-table column header -> party key. Covers the seat table and
# the otherwise-identical vote-share table; the '/' verb used on some tables
# ("I&O research") is not a party so is left unmapped.
HEADER_MAP = {
    "d66": "d66",
    "pvv": "pvv",
    "vvd": "vvd",
    "pro": "pro",
    "cda": "cda",
    "ja21": "ja21",
    "fvd": "fvd",
    "bbb": "bbb",
    "denk": "denk",
    "sgp": "sgp",
    "pvdd": "pvdd",
    "cu": "cu",
    "sp": "sp",
    "50+": "fiftyplus",
    "volt": "volt",
}

MIN_PARTIES = 10


def expand_grid(table):
    """Expand a <table> into (grid, metas) with rowspan/colspan handling.

    grid[r]  = list of physical-cell texts for row r
    metas[r] = list of (start_col, colspan, text) for the *raw* cells of row r,
               so merged group cells keep their colspan.
    """
    rows = table.find_all("tr")
    grid = []
    metas = []
    live = {}  # col -> [remaining_rows, text]
    for tr in rows:
        cells = tr.find_all(["td", "th"])
        out = []
        mrow = []
        col = 0
        i = 0
        while i < len(cells):
            while col in live and live[col][0] > 0:
                out.append(live[col][1])
                live[col][0] -= 1
                col += 1
            c = cells[i]
            txt = " ".join(c.get_text(" ", strip=True).split())
            cs = int(c.get("colspan") or 1)
            rs = int(c.get("rowspan") or 1)
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


def norm_header(text):
    text = re.sub(r"\[[^\]]*\]", "", text or "")
    for ch in "\u2013\u2014\u2015":
        text = text.replace(ch, "-")
    text = re.sub(r"\s*-\s*", "-", text)
    return re.sub(r"\s+", " ", text).strip().lower()


def parse_date(text):
    """Return the poll date as YYYY-MM-DD.

    Fieldwork ranges ("1– 2 Sep 2026") are reported at the END of the range —
    the last date found, since ranges read start-to-end.
    """
    text = re.sub(r"\[\d+\]", "", text).strip()
    if not text or text.lower() in ("—", "–", "-", "n/a", ""):
        return None
    text = text.replace("\u2013", "-").replace("\u2014", "-").replace("–", "-").replace("—", "-")
    dates = re.findall(r"(\d{1,2})\s*([A-Za-z]+)", text)
    if not dates:
        return None
    day, mon_name = dates[-1]
    mon = MONTHS.get(mon_name.lower()[:3])
    if not mon:
        return None
    ref_year = datetime.now().year
    try:
        d = datetime(ref_year, mon, int(day))
    except ValueError:
        return None
    # Year-crossing polls (e.g. "28 Dec" in a 2026 table are Dec 2025)
    if d > datetime.now():
        d = d.replace(year=d.year - 1)
    return d.strftime("%Y-%m-%d")


def parse_seats(text):
    """Return an integer seat count, or None.

    Only pure integers pass — this is what separates the seat table from the
    vote-share table (decimals/%) on the same page.
    """
    text = re.sub(r"\[\w+\]", "", text)
    text = re.sub(r"[\u00b9\u00b2\u00b3\u00b0\u2070-\u207f\u207a\u207b]+", "", text)
    text = text.strip()
    if not text or text.lower() in ("–", "—", "-", "n/a"):
        return None
    if not re.fullmatch(r"\d+", text):
        return None
    return int(text)


def scrape_netherlands():
    print(f"Fetching {WIKI_URL}...")
    resp = requests.get(WIKI_URL, headers={"User-Agent": "600-poll-scraper/1.0"}, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    polls = []
    seen = set()

    for el in soup.find_all(["h2", "h3", "table"]):
        if el.name != "table" or "wikitable" not in (el.get("class") or []):
            continue

        grid, metas = expand_grid(el)
        if not grid:
            continue

        # Header block: leading rows while the date column (col 1 for NL) is
        # not a date. Header row 0 labels pollster/date/sample + parties; row 1
        # re-labels the Others/Lead/Ref columns.
        header_end = 0
        while header_end < len(grid) and (
            len(grid[header_end]) < 2 or not parse_date(grid[header_end][1])
        ):
            header_end += 1
        if header_end == 0 or header_end >= len(grid):
            continue

        ncol = max(len(r) for r in grid[:header_end])
        hdr = [""] * ncol
        for col in range(ncol):
            for ri in range(header_end):
                if col < len(grid[ri]) and grid[ri][col]:
                    hdr[col] = grid[ri][col]
        mapped = [HEADER_MAP.get(norm_header(h)) for h in hdr]
        if sum(1 for k in mapped if k) < MIN_PARTIES:
            continue
        if "d66" not in mapped or "pvv" not in mapped:
            continue

        for ri in range(header_end, len(grid)):
            row = grid[ri]
            if len(row) < 8:
                continue
            pollster = re.sub(r"\[\w+\]", "", row[0]).strip()
            if not pollster or len(pollster) < 3:
                continue
            if "election" in pollster.lower():
                continue  # "2025 election" baseline row, not a poll
            date = parse_date(row[1])
            if not date:
                continue
            sample_text = re.sub(r"\[\w+\]", "", row[2]).strip()
            sample_digits = sample_text.replace(",", "").replace(" ", "")
            if sample_digits.isdigit():
                n = int(sample_digits)
            else:
                n = 0  # Peil.nl reports no sample size; app defaults to 1000

            votes = {}
            for start, span, txt in metas[ri]:
                if start >= len(mapped):
                    continue
                keys = [mapped[i] for i in range(start, min(start + span, len(mapped)))]
                nonempty = [k for k in keys if k]
                if not nonempty:
                    continue
                seats = parse_seats(txt)
                if seats is None:
                    continue
                if span > 1 and len(set(nonempty)) == 1:
                    votes[nonempty[0]] = seats
                elif span == 1:
                    votes[nonempty[0]] = votes.get(nonempty[0], 0) + seats
                else:
                    for k in nonempty:
                        votes.setdefault(k, seats)

            if len(votes) < MIN_PARTIES:
                continue
            total = sum(votes.values())
            if total < 130 or total > 155:
                continue  # seat table sums to ~150; vote-% table (~100) drops here

            poll = {
                "pollster": pollster,
                "date": date,
                "votes": votes,
                "country": COUNTRY,
                "source": "Wikipedia",
                "source_url": WIKI_URL,
                "n": n,
            }
            key = (pollster.lower(), date)
            if key not in seen:
                seen.add(key)
                polls.append(poll)

    # dedup identical votes
    seen2 = set()
    uniq = []
    for p in polls:
        k = (p["pollster"].lower(), p["date"], tuple(sorted(p["votes"].items())))
        if k not in seen2:
            seen2.add(k)
            uniq.append(p)
    uniq.sort(key=lambda p: p["date"], reverse=True)
    return uniq


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    polls = scrape_netherlands()
    print(f"Scraped {len(polls)} polls")
    output = {
        "country": COUNTRY,
        "source": "Wikipedia",
        "source_url": WIKI_URL,
        "scraped_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "poll_count": len(polls),
        "polls": polls,
    }
    out = OUTPUT_DIR / "polls.json"
    out.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {out}")

    meta = {
        "country": COUNTRY,
        "name": "Netherlands",
        "election_date": "2030-05-15",
        "seats": 150,
        "threshold": 0.67,
        "method": "dhondt",
        "constituencies": False,
        "notes": "Tweede Kamer: closed-list PR via D'Hondt in a single national constituency; no legal threshold (effective ~0.67% = 1 seat). Polls reported as seat projections; vote shares for the province map are approximated from seats (DHondt midpoint).",
    }
    meta_out = OUTPUT_DIR / "meta.json"
    meta_out.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {meta_out}")

    if polls:
        pollsters = sorted(set(p["pollster"] for p in polls))
        print(f"Pollsters ({len(pollsters)}): {', '.join(pollsters)}")
        print(f"Date range: {polls[-1]['date']} to {polls[0]['date']}")
        print("\nLatest 5:")
        for p in polls[:5]:
            top = sorted(p["votes"].items(), key=lambda x: -x[1])[:5]
            print(f"  {p['date']} {p['pollster']:22s} n={p['n']:<4d} {', '.join(f'{k}:{v}' for k, v in top)}")


if __name__ == "__main__":
    main()
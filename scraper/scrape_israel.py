#!/usr/bin/env python3
"""Scrape Israeli opinion polls from Wikipedia for the 2026 Knesset election.

Israeli polls are reported as SEAT projections (of 120). We store them as
raw seat counts — no conversion to vote share. Parties below the 3.25%
threshold are usually reported in % and are skipped (they win no seats).
The site runs the whole pipeline (averages, forecast, parliament) directly
in seat space (seatBased mode).

The Wikipedia tables have multi-row headers with rowspan/colspan groups
(e.g. "Joint List[ak]" spans the sub-columns Ra'am | Hadash–Ta'al | Balad).
Reading only the first `<tr>` misaligns every column after the group (the
old bug wrote Hadash–Ta'al values into Dems and ignored Yashar). We expand
the whole table into a rowspan/colspan-aware grid, merge the header rows
(deepest non-empty text per physical column), strip footnotes, and then map
each physical column. Hadash–Ta'al and Balad — the two halves of the merged
Joint List — are summed into the single `joint_list` party; a cell that
spans the whole group (e.g. a colspan=2 "7 seats") is used as the group
total rather than counted twice.
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

WIKI_URL = "https://en.wikipedia.org/wiki/Opinion_polling_for_the_2026_Israeli_legislative_election"
COUNTRY = "israel"
SEATS = 120
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / COUNTRY

MONTHS = {"jan":1,"feb":2,"mar":3,"apr":4,"may":5,"jun":6,"jul":7,"aug":8,"sep":9,"oct":10,"nov":11,"dec":12}

# Keys are normalized: footnotes stripped, dashes collapsed to "-", lowercase, whitespace collapsed.
HEADER_MAP = {
    "likud": "likud",
    "together": "together",
    "yesh atid": "together",
    "bennett 2026": "together",
    "rzp": "rzp",
    "rzp-zehut": "rzp",
    "otzma": "otzma",
    "blue & white": "blue_white",
    "shas": "shas",
    "reserv.": "reservists",
    "reservists": "reservists",
    "zionist home": "reservists",
    "zionist home-the reservists": "reservists",
    "amcha yisrael": "amcha",
    "winter": "amcha",
    "winter party": "amcha",
    "utj": "utj",
    "yisrael beiteinu": "yb",
    "ra'am": "raam",
    "joint list": "joint_list",
    "hadash-ta'al": "joint_list",
    "hadash": "joint_list",
    "balad": "joint_list",
    "dems": "dems",
    "yashar": "yashar",
}

MIN_SAMPLE = 100
MIN_PARTIES = 8


def expand_grid(table):
    """Expand a <table> into (grid, metas).

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


def parse_date(text, ref_year=2026):
    text = re.sub(r"\[\d+\]", "", text).strip()
    if not text or text.lower() in ("—", "–", "-", "n/a"):
        return None
    text = text.replace("\u2013", "-").replace("\u2014", "-").replace("–", "-").replace("—", "-")
    m = re.search(r"(\d{1,2})\s*([A-Za-z]+)", text)
    if not m:
        return None
    day, mon = int(m.group(1)), MONTHS.get(m.group(2).lower()[:3])
    if not mon:
        return None
    try:
        d = datetime(ref_year, mon, day)
    except ValueError:
        return None
    # Year-crossing polls (e.g. "31 Dec" in a 2026 table are Dec 2025)
    if d > datetime.now():
        d = d.replace(year=d.year - 1)
    return d.strftime("%Y-%m-%d")


def parse_value(text):
    """Return seat count for above-threshold parties, None for below-threshold % or missing."""
    text = re.sub(r"\[\w+\]", "", text)
    text = re.sub(r"[\u00b9\u00b2\u00b3\u00b0\u2070-\u207f\u207a\u207b]+", "", text)
    text = text.strip()
    if not text or text.lower() in ("–", "—", "-", "n/a"):
        return None
    if text.startswith("("):
        return None   # below-threshold share in % — no seats
    m = re.match(r"(\d+(?:\.\d+)?)", text)
    if not m:
        return None
    return int(float(m.group(1)))


def scrape_israel():
    print(f"Fetching {WIKI_URL}...")
    resp = requests.get(WIKI_URL, headers={"User-Agent": "600-poll-scraper/1.0"}, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    polls = []
    seen = set()
    current_year = None

    for el in soup.find_all(["h3", "table"]):
        if el.name == "h3":
            m = re.search(r"(20\d\d)", el.get_text())
            if m:
                current_year = m.group(1)
            continue
        if el.name != "table" or "wikitable" not in (el.get("class") or []):
            continue
        if current_year != "2026":
            continue

        grid, metas = expand_grid(el)
        if not grid:
            continue

        # Header block: leading rows while the leftmost cell is not a date.
        # (Header rows keep the meta labels via rowspan; the first data row
        # has a real date at column 0.)
        header_end = 0
        while header_end < len(grid) and not parse_date(grid[header_end][0] if grid[header_end] else ""):
            header_end += 1
        if header_end == 0:
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
        if "likud" not in mapped:
            continue

        for ri in range(header_end, len(grid)):
            row = grid[ri]
            if len(row) < 8:
                continue
            date = parse_date(row[0])
            if not date:
                continue
            pollster = re.sub(r"\[\w+\]", "", row[1]).strip()
            if not pollster or len(pollster) < 3:
                continue
            sample_text = re.sub(r"\[\w+\]", "", row[3]).strip()
            if not sample_text.isdigit() or int(sample_text) < MIN_SAMPLE:
                continue
            n = int(sample_text)

            votes = {}
            for start, span, txt in metas[ri]:
                if start >= len(mapped):
                    continue
                keys = [mapped[i] for i in range(start, min(start + span, len(mapped)))]
                nonempty = [k for k in keys if k]
                if not nonempty:
                    continue
                seats = parse_value(txt)
                if seats is None:
                    continue
                if span > 1 and len(set(nonempty)) == 1:
                    # cell spans the whole group (e.g. a merged Joint List):
                    # it is the group total, not a per-column repeat
                    votes[nonempty[0]] = seats
                elif span == 1:
                    votes[nonempty[0]] = votes.get(nonempty[0], 0) + seats
                else:
                    for k in nonempty:
                        votes.setdefault(k, seats)

            if len(votes) < MIN_PARTIES:
                continue
            total = sum(votes.values())
            # A correctly aligned poll lists all the main parties and sums to
            # about 120 seats; allow up to 122 for the occasional extra party,
            # which also bounds misalignment artifacts.
            if total < 80 or total > 122:
                continue

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
    polls = scrape_israel()
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
#!/usr/bin/env python3
"""Scrape Slovak opinion polls from Wikipedia for the next National Council election.

Polls are reported as VOTE SHARES (%) nationally. Slovakia has a single national
150-seat constituency; the 5% threshold applies to single parties (7% for
2-party and 10% for 3+ party coalitions). Seats are allocated by largest
remainder using the Republic Electoral Number (votes/(150+1)), approximated
here with the Hare/Niemeyer variant.

Wikipedia table layout (differs from Estonia): the fieldwork date is column 1
(polling firm column 0, sample size column 2), with the 14 parties from column
3 onward: Smer, PS, Hlas, then the "OĽaNO and Friends" group spanning the
Slovakia / ZĽ / KÚ sub-columns, KDH, SaS, SNS, Republika, Hungarian Alliance,
Democrats, We Are Family, ĽSNS, Others, Lead. Rows carry the year inside the
date text ("2–7 Sep 2026"), so no section-heading reference year is needed.
Only the first (Voting intention estimates) table is scraped — the later
tables are duplicate renderings, scenario polls, or seat projections. The
"2023 election" / "European election" baseline rows are rejected.
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

WIKI_URL = "https://en.wikipedia.org/wiki/Opinion_polling_for_the_next_Slovak_parliamentary_election"
COUNTRY = "slovakia"
SEATS = 150
THRESHOLD = 5.0
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / COUNTRY

MONTHS = {"jan":1,"feb":2,"mar":3,"apr":4,"may":5,"jun":6,"jul":7,"aug":8,"sep":9,"oct":10,"nov":11,"dec":12}

# Normalized poll-table column header -> party key (table reads left to right).
HEADER_MAP = {
    "smer": "smer",
    "ps": "ps",
    "hlas": "hlas",
    "slovakia": "slovensko",     # "Slovensko" party, OĽaNO successor within the group
    "slovensko": "slovensko",
    "zľ": "zl",                  # Za ľudí
    "zl": "zl",
    "kú": "ku",                  # Kresťanská únia
    "ku": "ku",
    "kdh": "kdh",
    "sas": "sas",
    "sns": "sns",
    "republika": "republika",
    "hungarian alliance": "aliancia",
    "democrats": "demokrati",
    "we are family": "rodina",
    "ľsns": "lsns",
    "ĺsns": "lsns",
    "others": "others",
}

MIN_PARTIES = 8
# Full signature of the main polling table (14 parties incl. the group trio).
REQUIRED_KEYS = {"smer", "ps", "slovensko", "zl", "ku"}


def expand_grid(table):
    """Expand a <table> into (grid, metas) with rowspan/colspan handling."""
    rows = table.find_all("tr")
    grid = []
    metas = []
    live = {}
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
    for ch in "\u2013\u2014\u2015\u2011":
        text = text.replace(ch, "-")
    return re.sub(r"\s+", " ", text).strip().lower()


def parse_date(text):
    """Return the poll end date as YYYY-MM-DD (locate year inside the text)."""
    text = re.sub(r"\[\d+\]", "", text).strip()
    if not text or text.lower() in ("—", "–", "-", "n/a", ""):
        return None
    year_m = re.search(r"\b(20\d{2})\b", text)
    if not year_m:
        return None
    year = int(year_m.group(1))
    for ch in "\u2013\u2014\u2015":
        text = text.replace(ch, "-")
    dates = re.findall(r"(\d{1,2})\s*([A-Za-z]+)", text)
    if not dates:
        return None
    day, mon_name = dates[-1]
    mon = MONTHS.get(mon_name.lower()[:3])
    if not mon:
        return None
    try:
        d = datetime(year, mon, int(day))
    except ValueError:
        return None
    return d.strftime("%Y-%m-%d")


def parse_pct(text):
    """Return a vote-share percentage (float), or None."""
    text = re.sub(r"\[\w+\]", "", text)
    text = re.sub(r"[\u00b9\u00b2\u00b3\u00b0\u2070-\u207f\u207a\u207b]+", "", text)
    text = text.strip().replace(",", ".")
    if not text or text.lower() in ("–", "—", "-", "n/a"):
        return None
    if not re.fullmatch(r"\d+(?:\.\d+)?", text):
        return None
    return float(text)


def scrape_slovakia():
    print(f"Fetching {WIKI_URL}...")
    resp = requests.get(WIKI_URL, headers={"User-Agent": "600-poll-scraper/1.0"}, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    polls = []
    seen = set()
    in_polling = False

    for el in soup.find_all(["h2", "h3", "table"]):
        if el.name in ("h2", "h3"):
            txt = el.get_text(strip=True).lower()
            if el.name == "h2" and "seat projection" in txt:
                break  # later tables are seat projections, not polls
            if "voting intention" in txt:
                in_polling = True
            continue
        if not in_polling:
            continue

        if "wikitable" not in (el.get("class") or []):
            continue

        grid, metas = expand_grid(el)
        if not grid:
            continue

        # Header block: leading rows while the date column (col 1 for SK) is not a date
        header_end = 0
        while header_end < len(grid) and (
            len(grid[header_end]) < 3 or not parse_date(grid[header_end][1])
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
        mapped_keys = set(m for m in mapped if m and m != "others")
        if not REQUIRED_KEYS.issubset(mapped_keys):
            continue  # not the full main polling table (seat/scenario/dup tables)
        if sum(1 for m in mapped if m and m != "others") < MIN_PARTIES:
            continue

        collected = 0
        for ri in range(header_end, len(grid)):
            row = grid[ri]
            if len(row) < 8:
                continue
            pollster = re.sub(r"\[\w+\]", "", row[0]).strip()
            if not pollster or len(pollster) < 3:
                continue
            if "election" in pollster.lower():
                continue  # "2023 election" / "European election" baseline rows
            date = parse_date(row[1])
            if not date:
                continue
            sample_text = re.sub(r"\[\w+\]", "", row[2]).strip()
            sample_digits = sample_text.replace(",", "").replace(" ", "")
            n = int(sample_digits) if sample_digits.isdigit() else 0  # app defaults to 1000

            votes = {}
            for start, span, txt in metas[ri]:
                if start >= len(mapped):
                    continue
                keys = [mapped[i] for i in range(start, min(start + span, len(mapped)))]
                nonempty = [k for k in keys if k and k != "others"]
                if not nonempty:
                    continue
                pct = parse_pct(txt)
                if pct is None:
                    continue
                if span > 1 and len(set(nonempty)) == 1:
                    votes[nonempty[0]] = pct
                elif span == 1:
                    votes[nonempty[0]] = votes.get(nonempty[0], 0) + pct
                else:
                    for k in nonempty:
                        votes.setdefault(k, pct)

            if len(votes) < MIN_PARTIES:
                continue
            total = sum(votes.values())
            if total < 80 or total > 115:
                continue  # vote-% table sums to ~100

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
                collected += 1

        if collected > 0:
            break  # Table 0 only; later wikitables are dups/scenarios/projections

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
    polls = scrape_slovakia()
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
        "name": "Slovakia",
        "election_date": "2027-09-28",
        "seats": 150,
        "threshold": 5.0,
        "method": "hare_niemeyer",
        "constituencies": False,
        "notes": "National Council: single national district, closed-list PR by largest remainder with the Republic Electoral Number (votes/(150+1)); 5% threshold (7% for 2-party, 10% for 3+ coalitions); polls reported as national vote shares.",
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
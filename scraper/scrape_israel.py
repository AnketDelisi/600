#!/usr/bin/env python3
"""Scrape Israeli opinion polls from Wikipedia for the 2026 Knesset election.

Israeli polls are reported as SEAT projections (of 120). We store them as
raw seat counts — no conversion to vote share. Parties below the 3.25%
threshold are usually reported in % and are skipped (they win no seats).
The site runs the whole pipeline (averages, forecast, parliament) directly
in seat space (seatBased mode).
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

HEADER_MAP = {
    "likud": "likud",
    "together": "together",
    "yesh atid": "together",
    "bennett 2026": "together",
    "rzp": "rzp",
    "rzp-zehut": "rzp",
    "rzp–zehut": "rzp",
    "otzma": "otzma",
    "blue & white": "blue_white",
    "shas": "shas",
    "utj": "utj",
    "yisrael beiteinu": "yb",
    "ra'am": "raam",
    "joint list": "joint_list",
    "hadash–ta'al": "joint_list",
    "hadash–ta'al[ak]": "joint_list",
    "dems": "dems",
    "yashar": "yashar",
}

MIN_SAMPLE = 100
MIN_PARTIES = 8


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
    text = re.sub(r"\[\w+\]", "", text).strip()
    if not text or text in ("–", "—", "-", "–", ""):
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

        rows = el.find_all("tr")
        if not rows:
            continue
        headers = [th.get_text(strip=True).lower() for th in rows[0].find_all("th")]
        # needs at least the main parties
        mapped = [HEADER_MAP.get(h) for h in headers]
        if sum(1 for k in mapped if k) < MIN_PARTIES:
            continue
        if "likud" not in mapped:
            continue

        for row in rows[1:]:
            # Expand colspans to physical columns so index alignment with the
            # header holds even when cells span multiple columns (e.g. RZP+Zehut
            # reported merged, or Joint List covering its sub-columns).
            cells = []
            for c in row.find_all(["td", "th"]):
                span = int(c.get("colspan") or 1)
                txt = c.get_text(strip=True)
                for _ in range(max(1, span)):
                    cells.append(txt)
            if len(cells) < 8:
                continue
            date = parse_date(cells[0])
            if not date:
                continue
            pollster = re.sub(r"\[\w+\]", "", cells[1]).strip()
            if not pollster or len(pollster) < 3:
                continue
            sample_text = re.sub(r"\[\w+\]", "", cells[3]).strip()
            if not sample_text.isdigit() or int(sample_text) < MIN_SAMPLE:
                continue
            n = int(sample_text)

            votes = {}
            for i, key in enumerate(mapped):
                if not key or i >= len(cells):
                    continue
                seats = parse_value(cells[i])
                if seats is None:
                    continue
                votes[key] = seats

            if len(votes) < MIN_PARTIES:
                continue
            total = sum(votes.values())
            # A correctly aligned poll lists all 11 main parties and sums to
            # exactly 120 seats; allow up to 122 for the occasional extra
            # party, which also bounds misalignment artifacts.
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
            top = sorted(p["votes"].items(), key=lambda x: -x[1])[:4]
            print(f"  {p['date']} {p['pollster']:22s} {', '.join(f'{k}:{v:.1f}' for k, v in top)}")


if __name__ == "__main__":
    main()
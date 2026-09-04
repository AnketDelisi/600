#!/usr/bin/env python3
"""Scrape Swedish opinion polls from Wikipedia for the 2026 election."""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

WIKI_URL = "https://en.wikipedia.org/wiki/Opinion_polling_for_the_2026_Swedish_general_election"
PARTY_COL_START = 3
PARTY_ORDER = ["V", "S", "MP", "C", "L", "M", "KD", "SD"]
MONTHS_SV = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}
COUNTRY = "sweden"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "sweden"

MIN_DATE = "2025-01-01"  # only keep polls for the 2026 election cycle
MIN_SAMPLE = 100
MAX_SAMPLE = 50000  # reject rows where "n" is actually vote counts (e.g. EP election)


def parse_part(s):
    """Parse a date part like '29 Dec', '29 Dec 2025', or bare '29'.

    Returns (day, month, year_or_None)."""
    s = s.strip()
    m = re.match(r"(\d{1,2})(?:\s+([A-Za-z]+)(?:\s+(\d{4}))?)?", s)
    if not m:
        return None
    day = int(m.group(1))
    month_str = m.group(2)
    month = MONTHS_SV.get(month_str.lower()[:3]) if month_str else None
    year = int(m.group(3)) if m.group(3) else None
    return day, month, year


def parse_fieldwork(text, ref_year):
    """Parse a fieldwork date range like '3–29 Dec', '30 Dec–12 Jan', '31 Dec 2025–9 Jan'.

    Handles:
    - bare day in first part ('3–29 Dec')
    - explicit years ('31 Dec 2025–9 Jan')
    - year-crossing ranges ('30 Dec–12 Jan' -> Dec ref_year, Jan ref_year+1)
    Returns (date_start, date_end) as ISO strings or (None, None).
    """
    text = text.strip()
    if not text or text.lower() in ("—", "n/a"):
        return None, None
    text = text.replace("\u2013", "-").replace("\u2014", "-").replace("–", "-").replace("—", "-")
    text = re.sub(r"\s+", " ", text).strip()
    parts = re.split(r"\s*[-–—]\s*", text)
    if not parts:
        return None, None

    p1 = parse_part(parts[0])
    p2 = parse_part(parts[1]) if len(parts) >= 2 else None
    if not p1:
        return None, None

    day1, mon1, yr1 = p1
    day2, mon2, yr2 = p2 if p2 else (None, None, None)

    # Single date without month in part 1: copy month/year from part 2 ('3–29 Dec')
    if mon1 is None and mon2 is not None:
        mon1, yr1 = mon2, yr2
    if mon1 is None:
        return None, None

    # Resolve years
    if yr1 is None and yr2 is not None:
        yr1 = yr2
    if yr2 is None and yr1 is not None:
        yr2 = yr1
    if yr1 is None:
        yr1 = ref_year
    if yr2 is None:
        yr2 = ref_year

    try:
        d1 = datetime(yr1, mon1, day1)
    except ValueError:
        return None, None

    if day2 is not None and mon2 is not None:
        try:
            d2 = datetime(yr2, mon2, day2)
        except ValueError:
            d2 = None
        if d2 and d1 > d2:
            # Year-crossing range: e.g. Dec -> Jan
            if p1[2] and not p2[2]:
                d2 = d2.replace(year=d2.year + 1)
            elif p2[2] and not p1[2]:
                d1 = d1.replace(year=d1.year - 1)
            else:
                d2 = d2.replace(year=d2.year + 1)
    else:
        d2 = None

    return d1.strftime("%Y-%m-%d"), (d2.strftime("%Y-%m-%d") if d2 else None)


def parse_sample(text):
    text = text.strip().replace(",", "")
    m = re.match(r"(\d+)", text)
    return int(m.group(1)) if m else None


def parse_pct(text):
    text = text.strip().replace(",", ".")
    m = re.match(r"(\d+\.?\d*)", text)
    return float(m.group(1)) if m else None


def is_valid_pollster(text):
    """Check if text looks like a pollster name, not a date/demographic/etc."""
    text = text.strip()
    if not text or len(text) < 2:
        return False
    # Reject if starts with a digit (could be a date)
    if text[0].isdigit():
        return False
    # Reject if it's a month or demographic
    lower = text.lower()
    if lower in ("may", "nov", "jun", "mar", "jan", "feb", "apr", "jul", "aug", "sep", "oct", "dec"):
        return False
    # Reject if it's a demographic category
    if any(w in lower for w in ("male", "female", "income", "swedish", "foreign", "own house", "lowest", "%")):
        return False
    # Reject election result rows and non-poll rows
    if "election" in lower or "ep " in lower or "ep " in lower:
        return False
    return True


def normalize_pollster(name):
    name = re.sub(r"\[\d+\]", "", name).strip()
    name = re.sub(r"Archived.*", "", name).strip()
    name = name.replace("DemoskopforAftonbladet", "Demoskop")
    name = name.replace("Indikator Opinion", "Indikator")
    name = name.replace("Kantar", "Verian")
    return name.strip()


def assign_ref_years(soup):
    """Map each wikitable to the year of the most recent preceding heading."""
    current_year = None
    table_years = {}
    for el in soup.find_all(["h2", "h3", "h4", "table"]):
        if el.name in ("h2", "h3", "h4"):
            m = re.search(r"(20\d{2})", el.get_text())
            if m:
                current_year = int(m.group(1))
        elif "wikitable" in (el.get("class") or []):
            table_years[id(el)] = current_year
    return table_years


def scrape_wikipedia():
    print(f"Fetching {WIKI_URL}...")
    resp = requests.get(WIKI_URL, headers={"User-Agent": "600-poll-scraper/1.0"}, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    tables = soup.find_all("table", class_="wikitable")
    print(f"Found {len(tables)} wikitable tables")

    table_years = assign_ref_years(soup)

    polls = []
    for table in tables:
        ref_year = table_years.get(id(table), 2026) or 2026

        rows = table.find_all("tr")
        for row in rows:
            cells = row.find_all("td")
            if len(cells) < 11:
                continue

            texts = [c.get_text(strip=True) for c in cells]
            pollster = texts[0]
            if not is_valid_pollster(pollster):
                continue
            pollster = normalize_pollster(pollster)

            date_str, date_end = parse_fieldwork(texts[1], ref_year)
            if not date_str:
                continue

            # Validate column 1 looks like a date (contains a month name)
            if not re.search(r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b", texts[1], re.I):
                continue

            # Validate column 2 is a plausible sample size
            sample_text = texts[2].replace(",", "").replace(".", "").strip()
            if not sample_text.isdigit():
                continue
            n = int(sample_text)
            if n < MIN_SAMPLE or n > MAX_SAMPLE:
                continue

            votes = {}
            for i, party in enumerate(PARTY_ORDER):
                val = parse_pct(texts[PARTY_COL_START + i])
                if val is not None:
                    votes[party] = round(val, 2)

            if len(votes) < 6:
                continue

            # Reject rows where party totals are implausible
            total = sum(votes.values())
            if total < 85 or total > 115:
                continue

            # Sanity check: S (Social Democrats) must be > 15% — column-shifted
            # tables from demographics/leadership sections produce garbage here
            if votes.get("S", 0) < 15:
                continue

            # Only keep polls for the 2026 election cycle
            if date_str < MIN_DATE:
                continue

            poll = {
                "pollster": pollster,
                "date": date_str,
                "votes": votes,
                "country": COUNTRY,
            }
            if date_end:
                poll["date_end"] = date_end
            poll["n"] = n
            polls.append(poll)

    return polls


def deduplicate(polls):
    seen = set()
    unique = []
    for p in polls:
        key = (p["pollster"].lower().strip(), p["date"], tuple(sorted(p["votes"].items())))
        if key not in seen:
            seen.add(key)
            unique.append(p)
    return unique


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    polls = scrape_wikipedia()
    print(f"Scraped {len(polls)} polls from Wikipedia")
    polls = deduplicate(polls)
    print(f"After dedup: {len(polls)} polls")
    polls.sort(key=lambda p: p["date"], reverse=True)

    output = {
        "country": COUNTRY,
        "source": "Wikipedia",
        "source_url": WIKI_URL,
        "scraped_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "poll_count": len(polls),
        "polls": polls,
    }

    out_file = OUTPUT_DIR / "polls_wiki.json"
    out_file.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {out_file}")

    if polls:
        print(f"\nDate range: {polls[-1]['date']} to {polls[0]['date']}")
        pollsters = sorted(set(p["pollster"] for p in polls))
        print(f"Pollsters ({len(pollsters)}): {', '.join(pollsters)}")
        print(f"\nLatest 5:")
        for p in polls[:5]:
            top = sorted(p["votes"].items(), key=lambda x: -x[1])[:3]
            print(f"  {p['date']} {p['pollster']:20s} {', '.join(f'{k}:{v:>5.1f}%' for k,v in top)}")


if __name__ == "__main__":
    main()
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


def parse_fieldwork(text, ref_year):
    text = text.strip()
    if not text or text.lower() in ("—", "n/a"):
        return None, None
    text = text.replace("\u2013", "-").replace("\u2014", "-").replace("–", "-").replace("—", "-")
    text = re.sub(r"\s+", " ", text).strip()
    parts = re.split(r"\s*[-–—]\s*", text)

    def parse_part(s, default_year=ref_year):
        s = s.strip()
        m = re.match(r"(\d{1,2})\s*([A-Za-z]+)", s)
        if not m:
            return None
        day, mon_str = int(m.group(1)), m.group(2).lower()[:3]
        month = MONTHS_SV.get(mon_str)
        if not month:
            return None
        try:
            return datetime(default_year, month, day).strftime("%Y-%m-%d")
        except ValueError:
            return None

    date_start = parse_part(parts[0])
    date_end = None
    if len(parts) >= 2:
        year_match = re.search(r"(\d{4})", parts[1])
        end_year = int(year_match.group(1)) if year_match else ref_year
        date_end = parse_part(parts[1], end_year)
    return date_start, date_end


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
    # Reject election result rows
    if "election" in lower or "ep " in lower:
        return False
    return True


def scrape_wikipedia():
    print(f"Fetching {WIKI_URL}...")
    resp = requests.get(WIKI_URL, headers={"User-Agent": "600-poll-scraper/1.0"}, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    tables = soup.find_all("table", class_="wikitable")
    print(f"Found {len(tables)} wikitable tables")

    polls = []
    for table in tables:
        # Find ref year from heading above
        ref_year = 2026
        el = table
        while el and el.parent:
            el = el.parent
            if el.name in ("h2", "h3", "h4"):
                year_match = re.search(r"(20\d{2})", el.get_text())
                if year_match:
                    ref_year = int(year_match.group(1))
                break

        rows = table.find_all("tr")
        for row in rows:
            cells = row.find_all("td")
            if len(cells) < 11:
                continue

            texts = [c.get_text(strip=True) for c in cells]
            pollster = texts[0]
            if not is_valid_pollster(pollster):
                continue
            # Clean pollster name
            pollster = re.sub(r"\[\d+\]", "", pollster).strip()
            pollster = re.sub(r"Archived.*", "", pollster).strip()
            pollster = pollster.replace("DemoskopforAftonbladet", "Demoskop")
            pollster = pollster.replace("Kantar", "Verian")

            date_str, date_end = parse_fieldwork(texts[1], ref_year)
            if not date_str:
                continue

            # Validate column 1 looks like a date (contains a month name)
            if not re.search(r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b", texts[1], re.I):
                continue

            # Validate column 2 is a plausible sample size (number ≥ 100)
            sample_text = texts[2].replace(",", "").replace(".", "").strip()
            if not sample_text.isdigit() or int(sample_text) < 100:
                continue

            n = parse_sample(texts[2])
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

            poll = {
                "pollster": pollster,
                "date": date_str,
                "votes": votes,
                "country": COUNTRY,
            }
            if date_end:
                poll["date_end"] = date_end
            if n:
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

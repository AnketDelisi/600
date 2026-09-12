#!/usr/bin/env python3
"""Scrape Austrian opinion polls from Wikipedia for the next Nationalrat election.

Table layout (nationwide polling for the next Austrian legislative election):
  Polling firm | Fieldwork date | Sample size | Method | FPÖ | ÖVP | SPÖ | NEOS |
  Grüne | KPÖ | Others | Lead

Values are vote-share percentages (%). Party columns start at index 4 (the
"Method" column is skipped). The 2026 task rows use English month names with a
space ("7-8 Sep 2026"), which the shared parse_fieldwork already handles.

Only the "Nationwide" tables are scraped: the article also carries a "By state"
Vienna table with the same column layout that must not leak in as national
polls. A row for the 2024 election result (pollster "2024 legislative
election") is rejected by the pollster sanity check. Parties polling below one
point occasionally report "–"; those cells become None and are skipped.
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

WIKI_URL = "https://en.wikipedia.org/wiki/Next_Austrian_legislative_election"
PARTY_COL_START = 4
PARTY_ORDER = ["fpoe", "oevp", "spoe", "neos", "gruene", "kpoe"]
MONTHS_EN = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}
COUNTRY = "austria"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / COUNTRY


def future_date(date_str):
    """Reject rows whose survey window is not yet complete (end date >= today)."""
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date() >= datetime.now(timezone.utc).date()
    except ValueError:
        return True


def parse_fieldwork(text, ref_year):
    text = text.strip()
    if not text or text.lower() in ("—", "n/a"):
        return None, None
    text = text.replace("\u2013", "-").replace("\u2014", "-").replace("–", "-").replace("—", "-")
    text = re.sub(r"\s+", " ", text).strip()
    # Fallback month: "7-8 Sep 2026" only mentions the month on the last day.
    month_tokens = re.findall(r"[A-Za-z]+", text)
    fallback_month = month_tokens[-1].lower()[:3] if month_tokens else None
    parts = re.split(r"\s*[-–—]\s*", text)

    def parse_part(s, default_year=ref_year):
        s = s.strip()
        m = re.match(r"(\d{1,2})(?:\s*([A-Za-z]+))?", s)
        if not m:
            return None
        day = int(m.group(1))
        mon_str = m.group(2) or fallback_month
        month = MONTHS_EN.get((mon_str or "").lower()[:3])
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
    if text in ("–", "—", "-", "?", "", "n/a"):
        return None
    m = re.match(r"(\d+\.?\d*)", text)
    return float(m.group(1)) if m else None


def is_valid_pollster(text):
    """Check if text looks like a pollster name, not a date/demographic/etc."""
    text = text.strip()
    if not text or len(text) < 2:
        return False
    if text[0].isdigit():
        return False
    lower = text.lower()
    if lower in ("may", "nov", "jun", "mar", "jan", "feb", "apr", "jul", "aug", "sep", "oct", "dec"):
        return False
    if any(w in lower for w in ("election", "ep ", "male", "female", "income", "%")):
        return False
    return True


def in_nationwide_scope(table):
    """Only scrape tables under the "Nationwide" section (skip By state/Vienna).

    Headings sit *before* their table as siblings, so walk the document
    backwards until we hit the heading that labels this table.
    """
    for heading in table.find_all_previous(["h2", "h3", "h4"]):
        h = (heading.get_text(strip=True) or "").lower()
        if heading.name == "h2":
            break
        if any(w in h for w in ("by state", "state polling", "vienna", "burgenland", "carinthia", "tyrol")):
            return False
    return True


def table_ref_year(table):
    """Year label of the nearest preceding heading ("2024"/"2025"/"2026")."""
    for heading in table.find_all_previous(["h2", "h3", "h4"]):
        match = re.search(r"(20\d{2})", heading.get_text(strip=True))
        if match:
            return int(match.group(1))
    return 2026


def scrape_wikipedia():
    print(f"Fetching {WIKI_URL}...")
    resp = requests.get(WIKI_URL, headers={"User-Agent": "600-poll-scraper/1.0"}, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    tables = soup.find_all("table", class_="wikitable")
    print(f"Found {len(tables)} wikitable tables")

    polls = []
    for table in tables:
        if not in_nationwide_scope(table):
            print(f"Skipping non-nationwide table")
            continue
        ref_year = table_ref_year(table)

        rows = table.find_all("tr")
        for row in rows:
            cells = row.find_all("td")
            if len(cells) < 12:
                continue

            texts = [c.get_text(strip=True) for c in cells]
            pollster = texts[0]
            if not is_valid_pollster(pollster):
                continue
            pollster = re.sub(r"\[\d+\]", "", pollster).strip()
            pollster = re.sub(r"Archived.*", "", pollster).strip()

            date_str, date_end = parse_fieldwork(texts[1], ref_year)
            if not date_str:
                continue
            if future_date(date_end or date_str):
                continue
            if not re.search(r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b", texts[1], re.I):
                continue

            sample_text = texts[2].replace(",", "").replace(".", "").strip()
            if not sample_text.isdigit() or int(sample_text) < 100:
                continue
            n = parse_sample(texts[2])

            votes = {}
            for i, party in enumerate(PARTY_ORDER):
                val = parse_pct(texts[PARTY_COL_START + i])
                if val is not None:
                    votes[party] = round(val, 2)

            if len(votes) < 5:
                continue

            total = sum(votes.values())
            if total < 85 or total > 115:
                continue

            # Column-shift guard: FPÖ has led every poll since late 2024 (28.8%+
            # at the 2024 election, 31+ in every poll). A shifted table here
            # means garbage.
            if votes.get("fpoe", 0) < 25:
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

    out_file = OUTPUT_DIR / "polls.json"
    out_file.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {out_file}")

    meta = {
        "country": COUNTRY,
        "name": "Austria",
        # No fixed date: the Nationalrat sits until autumn 2029 at the latest
        # (constitutional 5-year term).
        "election_date": "2029",
        "seats": 183,
        "threshold": 4.0,
        "method": "dhondt",
        "constituencies": False,
        "notes": "National Council: PR at three levels (one national, nine state, 39 regional constituencies); 4% national threshold.",
    }
    meta_file = OUTPUT_DIR / "meta.json"
    meta_file.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {meta_file}")

    if polls:
        print(f"\nDate range: {polls[-1]['date']} to {polls[0]['date']}")
        pollsters = sorted(set(p["pollster"] for p in polls))
        print(f"Pollsters ({len(pollsters)}): {', '.join(pollsters)}")
        print(f"\nLatest 5:")
        for p in polls[:5]:
            top = sorted(p["votes"].items(), key=lambda x: -x[1])[:3]
            print(f"  {p['date']} {p['pollster']:20s} {', '.join(f'{k}:{v:>5.1f}%' for k, v in top)}")


if __name__ == "__main__":
    main()
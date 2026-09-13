#!/usr/bin/env python3
"""Scrape Polish opinion polls from Wikipedia for the next Sejm election.

Table layout (nationwide polling for the next Polish parliamentary election,
current 2026 table):
  Polling firm/Link | Fieldwork date | Sample size | PiS | KO | Polska 2050 |
  PSL | Lewica | Razem | Konfederacja | KKP | R+ | Others | Don't know | Lead

We map party columns by header text because the party order differs between
year-tables, and only tables with the current 9-party layout are scraped: the
2026 section is the only one carrying the separate KKP and R+ columns (2024/23
used alliance columns TD/PJJ/BS; the "Alternative scenarios" table sits under a
non-year heading and is excluded). A row for the 2023 election result (pollster
"15 Oct" or containing "election") is rejected by the pollster sanity check.
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

WIKI_URL = "https://en.wikipedia.org/wiki/Opinion_polling_for_the_next_Polish_parliamentary_election"
# header text (exact cell text from the poll table) -> party key
PARTY_HEADERS = {
    "PiS": "pis", "KO": "ko", "Polska 2050": "pl2050", "PSL": "psl",
    "Lewica": "lewica", "Razem": "razem", "Konfederacja": "kwin",
    "KKP": "kkp", "R+": "r",
}
MONTHS_EN = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}
COUNTRY = "poland"
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
        if year_match and not re.search(r"\d{4}", parts[0]):
            date_start = parse_part(parts[0], end_year)
    if date_start and date_end and date_start > date_end:
        # Year-boundary survey ("31 Dec – 1 Jan"): start precedes end.
        date_start = datetime.strptime(date_start, "%Y-%m-%d").replace(
            year=int(date_start[:4]) - 1).strftime("%Y-%m-%d")
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
    if "election" in lower:
        return False
    return True


def table_heading_year(table):
    """The immediately-preceding section heading, if it is a bare year."""
    for heading in table.find_all_previous(["h2", "h3", "h4"]):
        text = heading.get_text(" ", strip=True)
        m = re.match(r"^(20\d{2})$", text)
        return int(m.group(1)) if m else None
    return None


def header_col_map(header_row):
    """Map party header cell text -> column index (0-based) for this table."""
    cells = header_row.find_all(["td", "th"])
    colmap = {}
    for i, cell in enumerate(cells):
        text = cell.get_text(" ", strip=True)
        for hdr, party in PARTY_HEADERS.items():
            if hdr in text:
                colmap[party] = i
    return colmap


def scrape_wikipedia():
    print(f"Fetching {WIKI_URL}...")
    resp = requests.get(WIKI_URL, headers={"User-Agent": "600-poll-scraper/1.0"}, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    tables = soup.find_all("table", class_="wikitable")
    print(f"Found {len(tables)} wikitable tables")

    polls = []
    for table in tables:
        ref_year = table_heading_year(table)
        if ref_year is None:
            print("Skipping table without a bare-year heading")
            continue
        rows = table.find_all("tr")
        if len(rows) < 2:
            continue
        colmap = header_col_map(rows[0])
        if set(PARTY_HEADERS.values()) - set(colmap):
            print(f"Skipping {ref_year} table: missing 9-party layout ({colmap})")
            continue

        for row in rows[1:]:
            cells = row.find_all("td")
            needed = max(colmap.values()) + 1
            if len(cells) < needed:
                continue

            texts = [c.get_text(" ", strip=True) for c in cells]
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
            if not re.search(r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b", texts[1], re.I):
                continue

            sample_text = texts[2].replace(",", "").replace(".", "").strip()
            if not sample_text.isdigit() or int(sample_text) < 100:
                continue
            n = parse_sample(texts[2])

            votes = {}
            for party, col in colmap.items():
                val = parse_pct(texts[col])
                if val is not None:
                    votes[party] = round(val, 2)

            if len(votes) < 5:
                continue

            total = sum(votes.values())
            if total < 85 or total > 115:
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
        "name": "Poland",
        "election_date": "2027",
        "seats": 460,
        "threshold": 5.0,
        "method": "dhondt",
        "constituencies": False,
        "notes": "Sejm: PR via D'Hondt in 41 multi-member constituencies (5% threshold, 8% for coalitions); modelled as a single national district; map colors per-okreg winners.",
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
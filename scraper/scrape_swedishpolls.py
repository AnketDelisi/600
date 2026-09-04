#!/usr/bin/env python3
"""Scrape Swedish opinion polls from SwedishPolls GitHub repo (CC0 data)."""

import csv
import io
import json
from datetime import datetime, timezone
from pathlib import Path

import requests

COUNTRY = "sweden"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "sweden"
CSV_URL = "https://raw.githubusercontent.com/MansMeg/SwedishPolls/master/Data/Polls.csv"

PARTIES = ["S", "M", "SD", "V", "C", "KD", "MP", "L"]


def scrape_swedishpolls():
    """Scrape polls from the SwedishPolls GitHub CSV (CC0 license)."""
    print(f"Fetching {CSV_URL}...")
    resp = requests.get(CSV_URL, timeout=30)
    resp.raise_for_status()

    reader = csv.DictReader(io.StringIO(resp.text))
    polls = []
    now = datetime.now(timezone.utc)

    for row in reader:
        # Filter for 2026
        pub_month = row.get("PublYearMonth", "")
        if not pub_month.startswith("2026-"):
            continue

        # Extract party votes
        votes = {}
        for party in PARTIES:
            val_str = row.get(party, "NA")
            if val_str in ("NA", "", "N/A"):
                continue
            try:
                votes[party] = round(float(val_str), 2)
            except ValueError:
                continue

        # Need at least 6 parties
        if len(votes) < 6:
            continue

        # Get publication date
        pub_date = row.get("PublDate", "")
        if pub_date in ("NA", ""):
            # Fall back to approx period
            pub_date = row.get("approxPeriod", "")
            if pub_date in ("NA", ""):
                continue

        poll = {
            "pollster": row.get("Company", "Unknown"),
            "date": pub_date,
            "votes": votes,
            "country": COUNTRY,
            "source": "SwedishPolls",
            "source_url": "https://github.com/MansMeg/SwedishPolls",
        }

        # Optional: sample size
        n_str = row.get("n", "")
        if n_str and n_str != "NA":
            try:
                poll["n"] = int(n_str)
            except ValueError:
                pass

        # Optional: fieldwork dates
        fw_from = row.get("collectPeriodFrom", "")
        fw_to = row.get("collectPeriodTo", "")
        if fw_from and fw_from != "NA":
            poll["fieldwork_start"] = fw_from
        if fw_to and fw_to != "NA":
            poll["fieldwork_end"] = fw_to

        # Optional: mode
        mode = row.get("Mode", "")
        if mode and mode != "NA":
            poll["mode"] = mode

        polls.append(poll)

    return polls


def deduplicate(polls):
    """Remove exact duplicate polls."""
    seen = set()
    unique = []
    for p in polls:
        key = (
            p["pollster"].lower().strip(),
            p["date"],
            tuple(sorted(p["votes"].items())),
        )
        if key not in seen:
            seen.add(key)
            unique.append(p)
    return unique


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    polls = scrape_swedishpolls()
    polls = deduplicate(polls)
    polls.sort(key=lambda p: p["date"], reverse=True)

    output = {
        "country": COUNTRY,
        "source": "SwedishPolls",
        "source_url": "https://github.com/MansMeg/SwedishPolls",
        "license": "CC0",
        "scraped_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "poll_count": len(polls),
        "polls": polls,
    }

    out_file = OUTPUT_DIR / "polls_swedishpolls.json"
    out_file.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {out_file}")
    print(f"  {len(polls)} polls from SwedishPolls")
    print(f"  Date range: {polls[-1]['date']} to {polls[0]['date']}")


if __name__ == "__main__":
    main()

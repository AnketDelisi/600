#!/usr/bin/env python3
"""Main scraper: runs all scrapers, merges, and outputs unified data."""

import json
from datetime import datetime, timezone
from pathlib import Path

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "sweden"
TODAY = datetime.now(timezone.utc).date().isoformat()


def load_json(path):
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return {"polls": []}


def valid_date(p):
    """A poll is only usable if it has an ISO date that is not in the future
    (upcoming/scheduled rows in source datasets must not skew the average)."""
    d = p.get("date")
    if not isinstance(d, str) or len(d) < 10:
        return False
    try:
        return d[:10] <= TODAY
    except TypeError:
        return False


def merge_polls(wiki_polls, sp_polls):
    """Merge polls from both sources. Wikipedia takes priority for duplicates.
    Drops poll rows whose date is missing or in the future."""
    merged = {}
    for p in wiki_polls:
        if not valid_date(p):
            continue
        key = (p["pollster"].lower().strip(), p["date"])
        merged[key] = p

    for p in sp_polls:
        if not valid_date(p):
            continue
        key = (p["pollster"].lower().strip(), p["date"])
        if key not in merged:
            merged[key] = p

    polls = sorted(merged.values(), key=lambda p: p["date"], reverse=True)
    return polls


def main():
    from scrape_wiki import scrape_wikipedia, deduplicate as dedup_wiki
    from scrape_swedishpolls import scrape_swedishpolls as scrape_sp, deduplicate as dedup_sp

    print("=" * 60)
    print("600 — Sweden Poll Scraper")
    print("=" * 60)

    # Source 1: Wikipedia
    print("\n[1/2] Wikipedia...")
    try:
        wiki_raw = scrape_wikipedia()
        wiki_polls = dedup_wiki(wiki_raw)
        print(f"  → {len(wiki_polls)} polls from Wikipedia")
    except Exception as e:
        print(f"  ✗ Wikipedia failed: {e}")
        wiki_polls = []

    # Source 2: SwedishPolls
    print("\n[2/2] SwedishPolls (GitHub)...")
    try:
        sp_raw = scrape_sp()
        sp_polls = dedup_sp(sp_raw)
        print(f"  → {len(sp_polls)} polls from SwedishPolls")
    except Exception as e:
        print(f"  ✗ SwedishPolls failed: {e}")
        sp_polls = []

    # Merge
    print(f"\nMerging sources...")
    all_polls = merge_polls(wiki_polls, sp_polls)
    print(f"  → {len(all_polls)} total polls (deduplicated)")

    # Write merged output
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output = {
        "country": "sweden",
        "sources": [
            {"name": "Wikipedia", "url": "https://en.wikipedia.org/wiki/Opinion_polling_for_the_2026_Swedish_general_election"},
            {"name": "SwedishPolls", "url": "https://github.com/MansMeg/SwedishPolls", "license": "CC0"},
        ],
        "scraped_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "poll_count": len(all_polls),
        "polls": all_polls,
    }

    out_path = OUTPUT_DIR / "polls.json"
    out_path.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nWrote {out_path}")

    # Summary
    if all_polls:
        date_range = f"{all_polls[-1]['date']} to {all_polls[0]['date']}"
        pollsters = sorted(set(p["pollster"] for p in all_polls))
        print(f"\n  Date range: {date_range}")
        print(f"  Pollsters ({len(pollsters)}): {', '.join(pollsters)}")
        print(f"\n  Latest 5 polls:")
        for p in all_polls[:5]:
            top = sorted(p["votes"].items(), key=lambda x: -x[1])[:3]
            print(f"    {p['date']} {p['pollster']:20s} {', '.join(f'{k}:{v:>5.1f}%' for k,v in top)}")


if __name__ == "__main__":
    main()

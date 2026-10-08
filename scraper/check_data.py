#!/usr/bin/env python3
"""Data-health canary for the daily scrape.

Compares every data/<cc>/polls.json against the last known-good snapshot in
data/health.json and fails loudly when a scraper silently regressed:

  - poll count dropped (a table that used to parse now returns fewer rows)
  - latest poll date went backwards (polls are historical facts - the newest
    poll can never get older)
  - the file has not been re-scraped for a week (the scraper is dead)

    python scraper/check_data.py            check, print report, exit 1 on errors
    python scraper/check_data.py --update   check and refresh data/health.json
                                            (only when the check passes, so a
                                            broken day never becomes baseline)
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
HEALTH = DATA / "health.json"
STALE_WARN_DAYS = 2
STALE_ERR_DAYS = 7
COUNT_TOLERANCE = 2


def parse_time(s):
    if not s:
        return None
    try:
        t = datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None
    return t if t.tzinfo else t.replace(tzinfo=timezone.utc)


def main():
    update = "--update" in sys.argv
    now = datetime.now(timezone.utc)
    base = json.loads(HEALTH.read_text(encoding="utf8")) if HEALTH.is_file() else {}

    snap, warns, errors = {}, [], []
    for d in sorted(DATA.iterdir()):
        pj = d / "polls.json"
        if not d.is_dir() or not pj.is_file():
            continue
        cc = d.name
        try:
            j = json.loads(pj.read_text(encoding="utf8"))
        except Exception as e:
            errors.append("%s: polls.json unreadable (%s)" % (cc, e))
            continue
        polls = j.get("polls") or []
        dates = [p.get("date") for p in polls if p.get("date")]
        entry = {
            "poll_count": len(polls),
            "latest_date": max(dates) if dates else None,
            "scraped_at": j.get("scraped_at"),
        }
        snap[cc] = entry

        b = base.get(cc)
        if not b:
            continue
        if entry["poll_count"] < b["poll_count"] - COUNT_TOLERANCE:
            errors.append("%s: poll count %d -> %d"
                          % (cc, b["poll_count"], entry["poll_count"]))
        if (b.get("latest_date") and entry["latest_date"]
                and entry["latest_date"] < b["latest_date"]):
            errors.append("%s: latest poll date %s -> %s"
                          % (cc, b["latest_date"], entry["latest_date"]))
        age = None
        t = parse_time(entry["scraped_at"])
        if t:
            age = (now - t).days
        if age is not None and age >= STALE_ERR_DAYS:
            errors.append("%s: not scraped for %d days" % (cc, age))
        elif age is not None and age >= STALE_WARN_DAYS:
            warns.append("%s: last scrape %d days ago" % (cc, age))

    for w in warns:
        print("WARN  " + w)
    for e in errors:
        print("ERROR " + e)
    print("checked %d countries, %d warn, %d error"
          % (len(snap), len(warns), len(errors)))
    if errors:
        print("health.json NOT updated")
        sys.exit(1)
    if update:
        HEALTH.write_text(json.dumps(snap, indent=1, sort_keys=True),
                          encoding="utf8", newline="")
        print("health.json updated")


if __name__ == "__main__":
    main()

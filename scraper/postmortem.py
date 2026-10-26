#!/usr/bin/env python3
"""Post-election poll and turnout diagnostics for the 2026 live races."""
import json
import statistics
from datetime import date, timedelta
from pathlib import Path

import turnout_model

ROOT = Path(__file__).resolve().parent.parent
LIVE = ROOT / "data" / "live"
RESULTS = json.loads((ROOT / "data" / "election_results.json").read_text(encoding="utf8"))
RACES = {
    "serbia": {"polls": "serbia", "live": "serbia-2026", "days": 10},
    "bgpres": {"polls": "bgpres", "live": "bulgaria-2026", "days": 10},
    "brazil": {"polls": "brazil", "live": "brazil-2026-r2", "days": 5},
}


def poll_avg(country, spec):
    data = json.loads((ROOT / "data" / spec["polls"] / "polls.json").read_text(encoding="utf8"))
    end = date.fromisoformat(RESULTS[country]["date"])
    start = end - timedelta(days=spec["days"])
    rows = []
    for poll in data.get("polls") or []:
        try:
            when = date.fromisoformat(poll["date"])
        except (KeyError, ValueError):
            continue
        if not (start <= when <= end):
            continue
        shares = poll.get("runoff") if country == "brazil" else poll.get("votes")
        if shares:
            rows.append(shares)
    parties = RESULTS[country]["shares"].keys()
    return {
        party: round(statistics.mean(row[party] for row in rows if party in row), 2)
        for party in parties
        if any(party in row for row in rows)
    }, len(rows)


def main():
    out = {}
    for country, spec in RACES.items():
        actual = RESULTS[country]
        average, n = poll_avg(country, spec)
        errors = {party: round(average[party] - actual["shares"][party], 2)
                  for party in average}
        base = turnout_model.prior(country)
        out[country] = {
            "date": actual["date"],
            "counted": actual["counted"],
            "poll_window_days": spec["days"],
            "poll_count": n,
            "poll_average": average,
            "actual": actual["shares"],
            "error": errors,
            "mae": round(statistics.mean(abs(v) for v in errors.values()), 2),
            "turnout": {
                "actual": actual["turnout"],
                "prior": base,
                "error": round(actual["turnout"] - base["mean"], 2) if base else None,
            },
            "source": actual["source"],
        }
    path = ROOT / "data" / "postmortem.json"
    path.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    for country, row in out.items():
        print(country, "poll MAE", row["mae"], "turnout", row["turnout"]["actual"],
              "prior", row["turnout"]["prior"]["mean"] if row["turnout"]["prior"] else None)


if __name__ == "__main__":
    main()

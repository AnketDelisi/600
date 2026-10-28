#!/usr/bin/env python3
"""Score the 2026 live races against the app's real forecast probabilities."""
import datetime
import json
import math
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
POST = json.loads((ROOT / "data" / "postmortem.json").read_text(encoding="utf8"))
ACTUAL = json.loads((ROOT / "data" / "election_results.json").read_text(encoding="utf8"))
RACES = {"serbia": "serbia", "bgpres": "bgpres", "brazil": "brazil"}


def poll_rows(country, spec):
    data = json.loads((ROOT / "data" / country / "polls.json").read_text(encoding="utf8"))
    end = datetime.date.fromisoformat(ACTUAL[country]["date"])
    start = end - datetime.timedelta(days=spec["poll_window_days"])
    rows = []
    for poll in data.get("polls") or []:
        try:
            when = datetime.date.fromisoformat(poll["date"])
        except (KeyError, ValueError):
            continue
        if not start <= when <= end:
            continue
        votes = poll.get("runoff") if country == "brazil" else poll.get("votes")
        if not votes:
            continue
        rows.append({
            "pollster": poll.get("pollster") or "unknown",
            "date": poll["date"],
            "votes": votes,
            "n": poll.get("n") or 1000,
            "method": poll.get("method") or "",
        })
    return rows


def average(cc, polls):
    out = subprocess.run(
        ["node", "scraper/forecast_run.js", "--avg", cc, json.dumps(polls)],
        cwd=ROOT, capture_output=True, text=True, encoding="utf8", check=True)
    return json.loads(out.stdout)


def forecast(cc, votes, n_polls):
    out = subprocess.run(
        ["node", "scraper/forecast_run.js", cc, json.dumps(votes), "2000", str(n_polls)],
        cwd=ROOT, capture_output=True, text=True, encoding="utf8", check=True)
    return json.loads(out.stdout)


def seats(cc, votes):
    out = subprocess.run(
        ["node", "scraper/seats_run.js", cc, json.dumps(votes)],
        cwd=ROOT, capture_output=True, text=True, encoding="utf8", check=True)
    return json.loads(out.stdout)


def main():
    cases = []
    for key, cc in RACES.items():
        actual = ACTUAL[key]
        rows = poll_rows(cc, POST[key])
        avg = average(cc, rows)
        result = forecast(cc, avg, len(rows))
        n = result["nSims"]
        largest = result["largest"]
        predicted = max(largest, key=largest.get)
        actual_winner = max(actual["shares"], key=actual["shares"].get)
        p = largest[predicted] / n
        case = {
            "race": key,
            "poll_average": {k: round(v, 2) for k, v in avg.items()
                             if v is not None and k != "other"},
            "simple_average": POST[key]["poll_average"],
            "poll_count": len(rows),
            "predicted": predicted,
            "actual": actual_winner,
            "probability": round(p, 3),
            "hit": predicted == actual_winner,
        }
        if cc == "serbia":
            actual_seats = seats(cc, actual["shares"])
            opp = sum(v for k, v in actual_seats.items()
                      if k in ("sl", "pes", "nada", "misn", "spp", "sda", "sdp", "kshlp"))
            case["majority"] = {
                "predicted_opp": round(result["maj"].get("td", 0) / n, 3),
                "actual_opp_seats": opp,
                "actual_opp_majority": opp >= 126,
            }
        cases.append(case)
    for case in cases:
        p = max(0.001, min(0.999, case["probability"]))
        z = math.log(p / (1 - p)) / 2.5
        case["calibrated"] = round(1 / (1 + math.exp(-z)), 3)
    brier = sum((c["calibrated"] - (1 if c["hit"] else 0)) ** 2 for c in cases) / len(cases)
    out = {
        "n": len(cases),
        "brier": round(brier, 4),
        "cases": cases,
        "note": "Three completed 2026 races; a diagnostic gate, not enough alone to recalibrate.",
    }
    (ROOT / "data" / "calibration_gate.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    print(json.dumps(out, ensure_ascii=False, indent=1))
    if brier > 0.30:
        raise SystemExit("calibration gate failed: Brier %.3f > 0.30" % brier)


if __name__ == "__main__":
    main()

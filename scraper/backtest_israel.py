#!/usr/bin/env python3
"""Walk-forward seat backtest for Israel's 2026 Knesset election.

Israel polls are published as seat projections, so the normal vote-share
backtest cannot score it. This harness uses the app's deployed seat-based
average and Monte Carlo via forecast_run.js, then scores the mean seats against
the final Knesset Count result.
"""
import json
import math
import subprocess
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIVE = ROOT / "data" / "live" / "israel-2026.json"
POLLS = ROOT / "data" / "israel" / "polls.json"
OUT = ROOT / "data" / "backtest_israel.json"
HORIZONS = (30, 14, 7, 0)


def app_avg(polls):
    path = ROOT / "scraper" / ".cache" / "israel_avg_polls.json"
    path.write_text(json.dumps(polls, ensure_ascii=False), encoding="utf8")
    out = subprocess.run(
        ["node", "scraper/forecast_run.js", "--avg", "israel",
         "@" + str(path)],
        cwd=ROOT, capture_output=True, text=True, encoding="utf8", check=True)
    return json.loads(out.stdout)


def forecast(avg, n_polls, horizon):
    out = subprocess.run(
        ["node", "scraper/forecast_run.js", "israel", json.dumps(avg),
         "4000", str(n_polls), str(horizon)],
        cwd=ROOT, capture_output=True, text=True, encoding="utf8", check=True)
    return json.loads(out.stdout)


def main():
    live = json.loads(LIVE.read_text(encoding="utf8"))
    actual = {e["id"]: int(e.get("seats") or 0) for e in live["entries"]}
    actual_pct = {e["id"]: float(e.get("pct") or 0) for e in live["entries"]}
    polls = json.loads(POLLS.read_text(encoding="utf8"))["polls"]
    election = date.fromisoformat(live["date"])
    rows = []
    for horizon in HORIZONS:
        as_of = election - timedelta(days=horizon)
        use = [p for p in polls
               if p.get("date") and date.fromisoformat(p["date"]) <= as_of]
        if len(use) < 2:
            continue
        avg = app_avg(use)
        fc = forecast(avg, len(use), horizon)
        means = fc.get("means") or {}
        keys = sorted(set(actual) | {k for k, v in means.items()
                                     if k != "other" and v > 0})
        errors = [means.get(k, 0) - actual.get(k, 0) for k in keys]
        seat_mae = sum(abs(e) for e in errors) / len(errors)
        actual_leader = max(actual, key=actual.get)
        projected_leader = max(means, key=means.get) if means else None
        rows.append({
            "horizon": horizon,
            "polls": len(use),
            "seat_mae": round(seat_mae, 2),
            "leader_actual": actual_leader,
            "leader_projected": projected_leader,
            "leader_hit": projected_leader == actual_leader,
            "mean_seats": {k: round(v, 1) for k, v in means.items()
                           if k != "other" and v > 0},
            "actual_seats": actual,
            "majority": fc.get("maj"),
            "n_sims": fc.get("nSims"),
        })
        print("T-%-2d polls=%-3d seat MAE %.2f  leader %s/%s  maj %s" %
              (horizon, len(use), seat_mae, projected_leader, actual_leader,
               fc.get("maj")))
    out = {
        "country": "israel",
        "election": live["date"],
        "source": live.get("source"),
        "status": live.get("status"),
        "turnout": live.get("turnout"),
        "actual_pct": actual_pct,
        "actual_seats": actual,
        "horizons": rows,
        "note": "Seat-based walk-forward using the deployed app average and "
                "seat Monte Carlo; preliminary final count from Knesset Count.",
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n",
                   encoding="utf8")
    print("wrote", OUT)


if __name__ == "__main__":
    main()

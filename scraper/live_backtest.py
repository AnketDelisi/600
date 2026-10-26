#!/usr/bin/env python3
"""Fold the 2026 live-race postmortem into the forecast error curve."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKTEST = ROOT / "data" / "backtest.json"
POSTMORTEM = ROOT / "data" / "postmortem.json"
HORIZONS = ("60", "30", "14", "7", "0")


def main():
    backtest = json.loads(BACKTEST.read_text(encoding="utf8"))
    postmortem = json.loads(POSTMORTEM.read_text(encoding="utf8"))
    countries = backtest.setdefault("countries", {})
    counts = backtest.setdefault("counts", {})
    live = backtest.setdefault("live_2026", {})
    for country, row in postmortem.items():
        if country in live:
            continue
        mae = float(row["mae"])
        current = countries.get(country) or {}
        n = int((counts.get(country) or {}).get("0", 0))
        blended = round((float(current.get("0", mae)) + mae) / 2, 2) if current else mae
        countries[country] = {
            horizon: round(max(blended, float(current.get(horizon, blended))), 2)
            for horizon in HORIZONS
        }
        counts[country] = {horizon: max(1, n + 1) for horizon in HORIZONS}
        live[country] = {
            "poll_mae": mae,
            "turnout": row["turnout"],
            "poll_count": row["poll_count"],
            "date": row["date"],
        }
    if not backtest.get("aggregate_live_applied") and live:
        vals = [row["poll_mae"] for row in live.values()]
        n = 15
        backtest["aggregate"]["0"] = round(
            (float(backtest["aggregate"]["0"]) * n + sum(vals)) / (n + len(vals)), 2)
        backtest["aggregate_live_applied"] = True
    BACKTEST.write_text(json.dumps(backtest, ensure_ascii=False, indent=1) + "\n",
                        encoding="utf8")
    for country, row in live.items():
        print(country, row["poll_mae"], row["turnout"]["actual"])


if __name__ == "__main__":
    main()

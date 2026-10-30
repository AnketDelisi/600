#!/usr/bin/env python3
"""Cheap model-health gate: calibration, 2026 cases, seat error."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKTEST = json.loads((ROOT / "data" / "backtest.json").read_text(encoding="utf8"))
CAL = json.loads((ROOT / "data" / "calibration_gate.json").read_text(encoding="utf8"))
SEAT = json.loads((ROOT / "data" / "seat_gate.json").read_text(encoding="utf8"))
INTERVAL = json.loads((ROOT / "data" / "interval_gate.json").read_text(encoding="utf8"))


def main():
    seat_mae = float(BACKTEST["seats"]["aggregate"]["0"])
    brier = float(CAL["brier"])
    if seat_mae > 4.0:
        raise SystemExit("seat gate failed: T-0 MAE %.2f > 4.0" % seat_mae)
    if brier > 0.30:
        raise SystemExit("calibration gate failed: Brier %.4f > 0.30" % brier)
    if not CAL.get("cases") or len(CAL["cases"]) < 3:
        raise SystemExit("calibration gate missing 2026 cases")
    state_seat = float(SEAT["horizons"]["0"]["seat_mae"])
    majority_brier = float(SEAT["majority"]["brier"])
    if state_seat > 3.5:
        raise SystemExit("state-space seat gate failed: T-0 MAE %.2f > 3.5" % state_seat)
    if majority_brier > 0.25:
        raise SystemExit("majority calibration gate failed: Brier %.4f > 0.25" % majority_brier)
    cal_int = INTERVAL.get("calibrated") or {}
    for kind in ("votes", "seats"):
        cov = (cal_int.get(kind) or {}).get("coverage")
        if cov is not None and not (0.85 <= cov <= 0.95):
            raise SystemExit("%s interval gate failed: coverage %.3f outside 0.85-0.95" %
                             (kind, cov))
    print("model gate ok: seat T-0 MAE %.2f, state-space seat %.2f, "
          "Brier %.4f / majority %.4f, %d live cases, interval %s/%s" %
          (seat_mae, state_seat, brier, majority_brier, len(CAL["cases"]),
           cal_int.get("votes", {}).get("coverage"),
           cal_int.get("seats", {}).get("coverage")))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Backtest the 90% vote/seat intervals produced by the deployed model.

This deliberately uses backtest.py's historical poll parsing and the real
Monte Carlo through forecast_run.js. It measures empirical coverage of the
5th-95th percentile intervals, then finds the scale that brings 90% intervals
closest to nominal coverage. No UI or model re-implementation lives here.
"""
import json
import statistics as st
import subprocess
from pathlib import Path

import backtest as bt

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "interval_gate.json"
HORIZONS = (60, 30, 14, 7, 0)
N_SIMS = 800
SCALES = (1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 3.0, 4.0, 5.0, 6.0)
SEAT_FLOORS = (0, 2, 4, 6, 8, 10)


def scaled(lo, hi, center, scale):
    return center + (lo - center) * scale, center + (hi - center) * scale


def summarize(rows, scales, floor=0):
    out = {}
    for scale in scales:
        hit = 0
        for r in rows:
            lo, hi = scaled(r["lo"], r["hi"], r["center"], scale)
            if floor:
                lo = min(lo, r["center"] - floor)
                hi = max(hi, r["center"] + floor)
            hit += lo <= r["actual"] <= hi
        out[str(scale)] = {"n": len(rows),
                           "coverage": round(hit / len(rows), 4) if rows else None}
    return out


def size_bucket(mean, kind):
    if kind == "votes":
        if mean >= 20: return "large"
        if mean >= 10: return "mid"
        if mean >= 5: return "small"
        return "tiny"
    if mean >= 30: return "large"
    if mean >= 10: return "mid"
    if mean >= 3: return "small"
    return "tiny"


def group_summary(rows, keyfn, scales, floor=0):
    groups = {}
    for r in rows:
        groups.setdefault(keyfn(r), []).append(r)
    return {k: summarize(v, scales, floor) for k, v in groups.items()}


def app_avg(country, polls):
    """The deployed state-space average, via forecast_run.js --avg."""
    path = Path(bt.CACHE) / "interval_avg_polls.json"
    path.write_text(json.dumps(polls, ensure_ascii=False), encoding="utf8")
    r = subprocess.run(
        ["node", "scraper/forecast_run.js", "--avg", country, "@" + str(path)],
        cwd=bt.ROOT, capture_output=True, text=True, encoding="utf8",
        timeout=300, check=True)
    return json.loads(r.stdout)


def main():
    rows = {"votes": [], "seats": []}
    by_horizon = {"votes": {}, "seats": {}}
    data = {}
    for country, cycles in bt.CYCLES.items():
        for cycle, spec in sorted(cycles.items()):
            spec["prev"] = spec.get("prev", "1900-01-01")
            polls = bt.parse_cycle(bt.fetch(spec["article"]), spec)
            data[(country, cycle)] = (polls, spec)
            print("== %s %d: %d polls" % (country, cycle, len(polls)))
            for horizon in HORIZONS:
                import datetime
                election = datetime.date.fromisoformat(spec["election"])
                as_of = election - datetime.timedelta(days=horizon)
                use = [p for p in polls
                       if bt._ord(p["date"]) <= bt._as_ord(as_of.isoformat())]
                if len(use) < 2:
                    continue
                avg = app_avg(country, use)
                smap = spec.get("seat_map", {})
                avg = {smap.get(k, k): v for k, v in avg.items()
                       if v is not None}
                if len(avg) < 3:
                    continue
                fc = bt.run_forecast(country, avg, N_SIMS, len(use), horizon)
                if not fc or not fc.get("intervals"):
                    continue
                means = fc.get("means") or {}
                vote_means = fc.get("voteMeans") or {}
                for p, actual in spec["result"].items():
                    iv = (fc["intervals"].get("votes") or {}).get(p)
                    if not iv or iv[0] is None:
                        continue
                    center = vote_means.get(p, (iv[0] + iv[1]) / 2)
                    row = {"horizon": horizon, "center": center,
                           "actual": actual, "lo": iv[0], "hi": iv[1],
                           "country": country, "party": p}
                    rows["votes"].append(row)
                    by_horizon["votes"].setdefault(horizon, []).append(row)
                for p, actual in (spec.get("seats") or {}).items():
                    iv = (fc["intervals"].get("seats") or {}).get(p)
                    if not iv or iv[0] is None:
                        continue
                    center = means.get(p, (iv[0] + iv[1]) / 2)
                    row = {"horizon": horizon, "center": center,
                           "actual": actual, "lo": iv[0], "hi": iv[1],
                           "country": country, "party": p}
                    rows["seats"].append(row)
                    by_horizon["seats"].setdefault(horizon, []).append(row)
    result = {
        "nominal": 0.9,
        "votes_by_country": group_summary(
            rows["votes"], lambda r: r["country"], SCALES),
        "votes_by_size": group_summary(
            rows["votes"], lambda r: size_bucket(r["center"], "votes"), SCALES),
        "seats_by_country": {
            c: {str(f): summarize(v, SCALES, f) for f in SEAT_FLOORS}
            for c, v in ((k, [r for r in rows["seats"]
                              if r["country"] == k])
                         for k in {r["country"] for r in rows["seats"]})
        },
        "seats_by_size": {
            b: {str(f): summarize(v, SCALES, f) for f in SEAT_FLOORS}
            for b, v in ((k, [r for r in rows["seats"]
                              if size_bucket(r["center"], "seats") == k])
                         for k in {size_bucket(r["center"], "seats")
                                   for r in rows["seats"]})
        },
        "n_sims": N_SIMS,
        "scales": list(SCALES),
        "votes": {
            "overall": summarize(rows["votes"], SCALES),
            "by_horizon": {str(h): summarize(v, SCALES)
                           for h, v in by_horizon["votes"].items()},
        },
        "seats": {
            "overall": {str(f): summarize(rows["seats"], SCALES, f)
                        for f in SEAT_FLOORS},
            "by_horizon": {str(h): {str(f): summarize(v, SCALES, f)
                                    for f in SEAT_FLOORS}
                           for h, v in by_horizon["seats"].items()},
        },
    }
    # closest-to-nominal global scale, independently for votes and seats
    best = None
    for s in SCALES:
        c = result["votes"]["overall"][str(s)]["coverage"]
        if c is None:
            continue
        score = abs(c - 0.9)
        if best is None or score < best[0]:
            best = (score, s, c)
    result["votes"]["recommended_scale"] = best[1] if best else None
    best = None
    for f in SEAT_FLOORS:
        for s in SCALES:
            c = result["seats"]["overall"][str(f)][str(s)]["coverage"]
            if c is None:
                continue
            score = abs(c - 0.9)
            if best is None or score < best[0]:
                best = (score, s, f, c)
    if best:
        result["seats"]["recommended_scale"] = best[1]
        result["seats"]["recommended_floor"] = best[2]
    # the values wired into js/app.js after this run
    result["calibrated"] = {
        "votes": {"scale": 2.0,
                  "coverage": result["votes"]["overall"]["2.0"]["coverage"]},
        "seats": {"scale": 1.0, "floor": 6,
                  "coverage": result["seats"]["overall"]["6"]["1.0"]["coverage"]},
    }
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=1) + "\n",
                   encoding="utf8")
    print(json.dumps({k: {"recommended_scale": result[k].get("recommended_scale"),
                          "recommended_floor": result[k].get("recommended_floor"),
                          "overall": result[k]["overall"]}
                      for k in ("votes", "seats")}, indent=1))
    print("wrote", OUT)


if __name__ == "__main__":
    main()

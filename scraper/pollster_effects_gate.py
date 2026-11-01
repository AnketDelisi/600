#!/usr/bin/env python3
"""Backtest the live pollster random-effect layer against historical cycles.

For every cycle in backtest.py, run the deployed ensemble average through the
real forecast twice: once without pollster random effects and once with them.
Score vote/seat interval coverage and point MAE against the actual outcome.
No Python reimplementation of the model exists: the Node harness loads the
same js/app.js.
"""
import json
import os
import subprocess
import tempfile
from pathlib import Path

import backtest as bt

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "pollster_effects_gate.json"
HORIZONS = (14, 0)
N_SIMS = 600
SKIP = {"netherlands"}  # seat-based polls; vote intervals are in seat units


def as_of_polls(polls, spec, horizon):
    import datetime
    election = datetime.date.fromisoformat(spec["election"])
    as_of = election - datetime.timedelta(days=horizon)
    cutoff = bt._as_ord(as_of.isoformat())
    return [p for p in polls if bt._ord(p["date"]) <= cutoff]


def run_node(cc, polls, n_polls, horizon, mode):
    fd, path = tempfile.mkstemp(suffix=".json")
    try:
        with os.fdopen(fd, "w", encoding="utf8") as fh:
            json.dump(polls, fh, ensure_ascii=False)
        r = subprocess.run(
            ["node", "scraper/pollster_backtest_run.js", cc, "@" + path,
             str(N_SIMS), str(n_polls), str(horizon), mode],
            cwd=ROOT, capture_output=True, text=True, encoding="utf8",
            timeout=300)
        if r.returncode != 0:
            return None
        return json.loads(r.stdout.strip())
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass


def score(fc, actual_votes, actual_seats):
    out = {"vote_hit": 0, "vote_n": 0, "seat_hit": 0, "seat_n": 0}
    cal = fc.get("calibrated") or {}
    for p, iv in (cal.get("votes") or {}).items():
        if p not in actual_votes or not iv:
            continue
        out["vote_n"] += 1
        out["vote_hit"] += iv[0] <= actual_votes[p] <= iv[1]
    for p, iv in (cal.get("seats") or {}).items():
        if p not in actual_seats or not iv:
            continue
        out["seat_n"] += 1
        out["seat_hit"] += iv[0] <= actual_seats[p] <= iv[1]
    vm = fc.get("voteMeans") or {}
    sm = fc.get("means") or {}
    out["vote_mae"] = (
        sum(abs(vm[p] - actual_votes[p]) for p in actual_votes
            if p in vm and vm[p] is not None) /
        max(1, sum(1 for p in actual_votes if p in vm and vm[p] is not None)))
    out["seat_mae"] = (
        sum(abs(sm[p] - actual_seats[p]) for p in actual_seats
            if p in sm and sm[p] is not None) /
        max(1, sum(1 for p in actual_seats if p in sm and sm[p] is not None)))
    return out


def main():
    rows = []
    for cc, cycles in bt.CYCLES.items():
        if cc in SKIP:
            continue
        for cycle, spec in sorted(cycles.items()):
            spec["prev"] = spec.get("prev", "1900-01-01")
            polls = bt.parse_cycle(bt.fetch(spec["article"]), spec)
            if not polls:
                continue
            for h in HORIZONS:
                use = as_of_polls(polls, spec, h)
                if not use:
                    continue
                base = run_node(cc, use, len(use), h, "base")
                eff = run_node(cc, use, len(use), h, "effects")
                if not base or not eff:
                    print("skip", cc, cycle, h)
                    continue
                b = score(base, spec["result"], spec.get("seats") or {})
                e = score(eff, spec["result"], spec.get("seats") or {})
                row = {"country": cc, "cycle": cycle, "horizon": h,
                       "polls": len(use), "effects": eff.get("effectsCount", 0),
                       "base": b, "effects_score": e}
                rows.append(row)
                print("%s %s T-%d n=%d effects=%d vote %.3f/%.3f seat %.3f/%.3f" % (
                    cc, cycle, h, len(use), row["effects"],
                    b["vote_hit"] / max(1, b["vote_n"]),
                    e["vote_hit"] / max(1, e["vote_n"]),
                    b["seat_hit"] / max(1, b["seat_n"]),
                    e["seat_hit"] / max(1, e["seat_n"])))
    def agg(mode):
        vote_hit = sum(r[mode]["vote_hit"] for r in rows)
        vote_n = sum(r[mode]["vote_n"] for r in rows)
        seat_hit = sum(r[mode]["seat_hit"] for r in rows)
        seat_n = sum(r[mode]["seat_n"] for r in rows)
        return {"vote_coverage": round(vote_hit / vote_n, 4) if vote_n else None,
                "seat_coverage": round(seat_hit / seat_n, 4) if seat_n else None,
                "vote_mae": round(sum(r[mode]["vote_mae"] for r in rows) / len(rows), 3),
                "seat_mae": round(sum(r[mode]["seat_mae"] for r in rows) / len(rows), 3)}
    out = {"n_sims": N_SIMS, "horizons": HORIZONS, "rows": rows,
           "base": agg("base"), "effects": agg("effects_score")}
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf8")
    print("\nbase   ", out["base"])
    print("effects", out["effects"])
    print("wrote", OUT)


if __name__ == "__main__":
    main()

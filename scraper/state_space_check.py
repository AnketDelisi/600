#!/usr/bin/env python3
"""Walk-forward check: local-level state-space vs the current weighted average."""
import datetime
import math
import statistics as st

import backtest as bt

HORIZONS = (60, 30, 14, 7, 0)
PROCESS_VAR = 0.25
OBS_SCALE = 2500.0


def ss_average(polls, as_of, half_life):
    out = {}
    keys = set(k for p in polls for k in p["votes"])
    for key in keys:
        rows = []
        for p in polls:
            if key not in p["votes"]:
                continue
            days = (as_of - bt._ord(p["date"]))
            if days < 0:
                continue
            rows.append((days, p["votes"][key], max(50, p.get("n") or 50)))
        if not rows:
            continue
        rows.sort(reverse=True)
        mean = rows[0][1]
        var = 4.0
        last = rows[0][0]
        for days, value, n in rows:
            gap = max(0, last - days)
            var += PROCESS_VAR * gap
            obs = OBS_SCALE / n
            gain = var / (var + obs)
            mean += gain * (value - mean)
            var *= (1.0 - gain)
            last = days
        out[key] = mean
    return out


def score(polls, spec, horizon, state=False):
    election = datetime.date.fromisoformat(spec["election"])
    as_of = election - datetime.timedelta(days=horizon)
    use = [p for p in polls if bt._ord(p["date"]) <= bt._as_ord(as_of.isoformat())]
    if not use:
        return None
    avg = ss_average(use, bt._as_ord(as_of.isoformat()), spec["half_life"]) if state else bt.average(use, bt._as_ord(as_of.isoformat()), spec["half_life"])
    keys = [k for k in spec["result"] if avg.get(k) is not None]
    if len(keys) < 3:
        return None
    errs = [avg[k] - spec["result"][k] for k in keys]
    return st.mean(abs(e) for e in errs)


def main():
    for horizon in HORIZONS:
        base, state = [], []
        for country, cycles in bt.CYCLES.items():
            for cycle, spec in cycles.items():
                spec["prev"] = spec.get("prev", "1900-01-01")
                soup = bt.fetch(spec["article"])
                polls = bt.parse_cycle(soup, spec)
                if not polls:
                    continue
                a = score(polls, spec, horizon, False)
                b = score(polls, spec, horizon, True)
                if a is not None and b is not None:
                    base.append(a); state.append(b)
        if base:
            print("T-%-2d n=%2d base %.2f state %.2f delta %+.2f" %
                  (horizon, len(base), st.mean(base), st.mean(state),
                   st.mean(state) - st.mean(base)))


if __name__ == "__main__":
    main()

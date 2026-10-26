#!/usr/bin/env python3
"""Walk-forward check: simple vs empirical-Bayes house effects."""
import datetime
import math
import statistics as st

import backtest as bt
import state_space_check as ss

HORIZONS = (30, 14, 7, 0)
MIN_POLLS = 2
CAP = 2.5


def effects(polls, party, as_of, half_life, mode):
    rows = []
    for p in polls:
        if party not in p["votes"]:
            continue
        days = bt._as_ord(as_of) - bt._ord(p["date"])
        if days < 0:
            continue
        w = math.pow(0.5, days / half_life) * min(1500, p.get("n") or 50)
        rows.append((p["pollster"], p["votes"][party], w))
    if not rows:
        return {}
    total = sum(w for _, _, w in rows)
    consensus = sum(v * w for _, v, w in rows) / total
    by = {}
    for ps, value, w in rows:
        by.setdefault(ps, []).append((value, w))
    raw = {}
    for ps, items in by.items():
        if len(items) < MIN_POLLS:
            continue
        tw = sum(w for _, w in items)
        mean = sum(v * w for v, w in items) / tw
        var = sum(w * (v - mean) ** 2 for v, w in items) / tw
        raw[ps] = {"d": mean - consensus, "se": math.sqrt(var / len(items)),
                   "n": len(items), "w": tw}
    if not raw:
        return {}
    if mode == "simple":
        return {ps: max(-CAP, min(CAP, item["d"] * 0.5)) for ps, item in raw.items()}
    weighted_mean = sum(item["d"] * item["w"] for item in raw.values()) / sum(item["w"] for item in raw.values())
    q = sum(item["w"] * (item["d"] - weighted_mean) ** 2 for item in raw.values()) / sum(item["w"] for item in raw.values())
    se2 = sum(item["se"] ** 2 for item in raw.values()) / len(raw)
    tau2 = max(0.0, q - se2)
    if tau2 <= 0:
        return {}
    return {ps: max(-CAP, min(CAP, item["d"] * tau2 / (tau2 + item["se"] ** 2)))
            for ps, item in raw.items()}


def apply(polls, as_of, half_life, mode):
    out = [dict(p, votes=dict(p["votes"])) for p in polls]
    parties = {k for p in out for k in p["votes"]}
    for party in parties:
        eff = effects(out, party, as_of, half_life, mode)
        for p in out:
            if party in p["votes"] and p["pollster"] in eff:
                p["votes"][party] -= eff[p["pollster"]]
    return out


def score(polls, spec, horizon, mode):
    election = datetime.date.fromisoformat(spec["election"])
    as_of = election - datetime.timedelta(days=horizon)
    use = [p for p in polls if bt._ord(p["date"]) <= bt._as_ord(as_of.isoformat())]
    if not use:
        return None
    avg = ss.ss_average(apply(use, as_of.isoformat(), spec["half_life"], mode) if mode else use,
                        bt._as_ord(as_of.isoformat()), spec["half_life"])
    keys = [k for k in spec["result"] if avg.get(k) is not None]
    if len(keys) < 3:
        return None
    return st.mean(abs(avg[k] - spec["result"][k]) for k in keys)


def main():
    data = {}
    for country, cycles in bt.CYCLES.items():
        for cycle, spec in cycles.items():
            spec["prev"] = spec.get("prev", "1900-01-01")
            polls = bt.parse_cycle(bt.fetch(spec["article"]), spec)
            if polls:
                data[(country, cycle)] = (polls, spec)
    for horizon in HORIZONS:
        rows = {m: [] for m in (None, "simple", "eb")}
        for polls, spec in data.values():
            for mode in rows:
                value = score(polls, spec, horizon, mode)
                if value is not None:
                    rows[mode].append(value)
        print("T-%-2d n=%d baseline %.2f simple %.2f eb %.2f" % (
            horizon, len(rows[None]),
            st.mean(rows[None]), st.mean(rows["simple"]), st.mean(rows["eb"])))


if __name__ == "__main__":
    main()

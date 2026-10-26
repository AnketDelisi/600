#!/usr/bin/env python3
"""Seat/majority gate using the shared state-space + EB house-effect votes."""
import datetime
import json
import statistics as st
from pathlib import Path

import backtest as bt
import house_effects_check as he
import state_space_check as ss

ROOT = Path(__file__).resolve().parent.parent
HORIZONS = (30, 14, 7, 0)


def votes_at(polls, spec, horizon):
    election = datetime.date.fromisoformat(spec["election"])
    as_of = election - datetime.timedelta(days=horizon)
    use = [p for p in polls if bt._ord(p["date"]) <= bt._as_ord(as_of.isoformat())]
    if not use:
        return None, 0
    adjusted = he.apply(use, as_of.isoformat(), spec["half_life"], "eb")
    avg = ss.ss_average(adjusted, bt._as_ord(as_of.isoformat()), spec["half_life"])
    smap = spec.get("seat_map", {})
    votes = {smap.get(k, k): v for k, v in avg.items() if v is not None}
    return (votes, len(use)) if len(votes) >= 3 else (None, 0)


def main():
    cycles = []
    for country, rows in bt.CYCLES.items():
        for cycle, spec in rows.items():
            if not spec.get("seats"):
                continue
            spec["prev"] = spec.get("prev", "1900-01-01")
            polls = bt.parse_cycle(bt.fetch(spec["article"]), spec)
            if polls:
                cycles.append((country, cycle, polls, spec))
    out = {"horizons": {}, "majority": {}}
    for horizon in HORIZONS:
        scores = []
        for country, cycle, polls, spec in cycles:
            votes, n = votes_at(polls, spec, horizon)
            if not votes:
                continue
            proj = bt.run_seats(country, votes)
            if not proj:
                continue
            mae, lead = bt.score_proj(proj, spec["seats"])
            scores.append(mae)
        out["horizons"][str(horizon)] = {
            "n": len(scores), "seat_mae": round(st.mean(scores), 2) if scores else None}
    majority = []
    for country, cycle, polls, spec in cycles:
        votes, n = votes_at(polls, spec, 0)
        bl = bt.country_blocs(country)
        if not votes or not bl:
            continue
        fc = bt.run_forecast(country, votes, 500, n)
        if not fc:
            continue
        means = {k: v for k, v in (fc.get("means") or {}).items() if k != "other"}
        pred = max(means, key=means.get) if means else None
        bloc = None
        if pred in bl.get("bloc1", []):
            bloc = "bloc1"
        elif pred in bl.get("bloc2", []):
            bloc = "bloc2"
        if not bloc:
            continue
        total = sum(spec["seats"].values())
        need = total // 2 + 1
        actual = sum(spec["seats"].get(p, 0) for p in bl[bloc])
        p = (fc.get("maj") or {}).get("rg" if bloc == "bloc1" else "td", 0) / fc["nSims"]
        majority.append({"country": country, "cycle": cycle, "p": round(p, 3),
                         "hit": actual >= need})
    brier = (sum((c["p"] - (1 if c["hit"] else 0)) ** 2 for c in majority)
             / len(majority)) if majority else None
    out["majority"] = {"n": len(majority), "brier": round(brier, 4) if brier is not None else None,
                       "cases": majority}
    path = ROOT / "data" / "seat_gate.json"
    path.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    print(json.dumps(out["horizons"], indent=1))
    print("majority", len(majority), "cases")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Estimate party share sensitivity to regional turnout.

This is a calibration prior, not a causal estimate: regions with higher
turnout may also differ in composition. Shrink and cap the slope before use.
"""
import json
import statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "turnout_regions.json"
OUT = ROOT / "data" / "turnout_tilts.json"
SHRINK = {"serbia": 0.25, "brazil": 0.5}
CAP = 2.0


def slope(rows, party):
    sample = [row for row in rows if party in row.get("shares", {})]
    if len(sample) < 3:
        return None
    xs = [float(row["turnout"]) for row in sample]
    ys = [float(row["shares"][party]) for row in sample]
    ws = [float(row.get("votes") or 1) for row in sample]
    mx = statistics.mean(xs)
    my = statistics.mean(ys)
    den = sum(w * (x - mx) ** 2 for x, w in zip(xs, ws))
    if den <= 0:
        return None
    num = sum(w * (x - mx) * (y - my) for x, y, w in zip(xs, ys, ws))
    return num / den


def main():
    data = json.loads(DATA.read_text(encoding="utf8"))
    out = {}
    for country, payload in data.items():
        rows = payload.get("regions") or []
        parties = sorted({party for row in rows for party in (row.get("shares") or {})})
        out[country] = {}
        for party in parties:
            value = slope(rows, party)
            if value is None:
                continue
            value *= SHRINK.get(country, 0.25)
            out[country][party] = round(max(-CAP, min(CAP, value)), 3)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()

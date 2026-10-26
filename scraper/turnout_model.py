#!/usr/bin/env python3
"""Turnout priors and scenarios from historical national elections."""
import json
import statistics
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data" / "turnout.json"
CURRENT = "2026-10-25"


def load():
    return json.loads(DATA.read_text(encoding="utf8"))


def elections(country):
    return list((load().get(country) or {}).get("elections") or [])


def historical(country, exclude=CURRENT):
    return [row for row in elections(country) if row.get("date") != exclude]


def prior(country, exclude=CURRENT):
    rows = historical(country, exclude)
    values = [float(row["turnout"]) for row in rows if row.get("turnout") is not None]
    if not values:
        return None
    mean = statistics.mean(values)
    sigma = statistics.stdev(values) if len(values) > 1 else 0.0
    return {
        "country": country,
        "mean": round(mean, 2),
        "sigma": round(max(0.5, sigma), 2),
        "n": len(values),
        "min": min(values),
        "max": max(values),
    }


def scenario(country, z=0.0, exclude=CURRENT):
    base = prior(country, exclude)
    if not base:
        return None
    value = base["mean"] + float(z) * base["sigma"]
    return round(max(0.0, min(100.0, value)), 2)


def actual(country):
    rows = elections(country)
    if not rows:
        return None
    row = max(rows, key=lambda item: item.get("date") or "")
    return {"date": row.get("date"), "turnout": row.get("turnout"),
            "note": row.get("note"), "registered": row.get("registered"),
            "voted": row.get("voted")}


if __name__ == "__main__":
    for key in load():
        print(key, prior(key), "actual", actual(key))

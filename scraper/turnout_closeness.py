#!/usr/bin/env python3
"""Test whether close elections and incumbent swings predict turnout.

Data: ParlGov election results and turnout, 1990 onwards, parliamentary
elections only. Closeness is the actual top-two vote margin; incumbent swing
is the previous election's largest party's current vote-share change.
"""
import csv
import io
import json
import statistics as st
from pathlib import Path

import numpy as np
import requests

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "scraper" / ".cache"
BASE = "https://www.parlgov.org/data/parlgov-development_csv-utf-8/"
FILES = {"election": "view_election.csv", "params": "viewcalc_election_parameter.csv"}


def download(name):
    path = CACHE / ("turnout_" + name + ".csv")
    if not path.exists():
        r = requests.get(BASE + FILES[name], timeout=120)
        r.raise_for_status()
        path.write_bytes(r.content)
    return path.read_text(encoding="utf-8")


def build():
    elections = {}
    for row in csv.DictReader(io.StringIO(download("election"))):
        if row.get("election_type") != "parliament":
            continue
        try:
            year = int(row["election_date"][:4])
        except Exception:
            continue
        if year < 1990:
            continue
        eid = row["election_id"]
        item = elections.setdefault(eid, {
            "country": row["country_name_short"], "date": row["election_date"],
            "year": year, "parties": {}, "previous": row.get("previous_parliament_election_id") or None,
        })
        party = row.get("party_name_english") or row.get("party_name")
        try:
            votes = float(row["vote_share"])
            seats = int(float(row["seats"] or 0))
        except Exception:
            continue
        if not party:
            continue
        old = item["parties"].get(party)
        if old is None or votes > old["votes"]:
            item["parties"][party] = {"votes": votes, "seats": seats}
    turnout = {}
    for row in csv.DictReader(io.StringIO(download("params"))):
        try:
            turnout[row["election_id"]] = float(row["turnout"])
        except Exception:
            pass
    rows = []
    for eid, item in elections.items():
        if eid not in turnout or len(item["parties"]) < 2:
            continue
        ranked = sorted(item["parties"].items(), key=lambda kv: (kv[1]["seats"], kv[1]["votes"]), reverse=True)
        top, second = ranked[0], ranked[1]
        margin = top[1]["votes"] - second[1]["votes"]
        swing = None
        prev = elections.get(item["previous"])
        if prev and prev["parties"]:
            prev_top = max(prev["parties"].items(), key=lambda kv: (kv[1]["seats"], kv[1]["votes"]))[0]
            if prev_top in item["parties"]:
                swing = item["parties"][prev_top]["votes"] - prev["parties"][prev_top]["votes"]
        rows.append({
            "election_id": eid, "country": item["country"], "date": item["date"],
            "year": item["year"], "turnout": turnout[eid], "margin": margin,
            "closeness": 100.0 - margin, "incumbent_swing": swing,
        })
    return rows


def demean(values, groups):
    out = []
    for value, group in zip(values, groups):
        peers = [v for v, g in zip(values, groups) if g == group and v is not None]
        out.append(value - st.mean(peers) if value is not None and len(peers) > 1 else None)
    return out


def ols(y, xs):
    mask = [i for i, value in enumerate(y) if value is not None and all(x[i] is not None for x in xs)]
    Y = np.array([y[i] for i in mask], dtype=float)
    X = np.column_stack([[1.0] * len(mask)] + [[x[i] for i in mask] for x in xs])
    beta, *_ = np.linalg.lstsq(X, Y, rcond=None)
    resid = Y - X @ beta
    return beta.tolist(), float(np.mean(resid ** 2)), len(mask)


def main():
    rows = build()
    countries = {row["country"] for row in rows}
    clean = [row for row in rows if row["incumbent_swing"] is not None]
    print("n=%d elections, %d countries; with incumbent swing n=%d" % (len(rows), len(countries), len(clean)))
    print("turnout mean %.2f, closeness mean %.2f" % (
        st.mean(row["turnout"] for row in rows), st.mean(row["closeness"] for row in rows)))
    # within-country correlations
    for field in ("closeness", "incumbent_swing"):
        vals = [row for row in rows if row[field] is not None]
        groups = [row["country"] for row in vals]
        tv = demean([row["turnout"] for row in vals], groups)
        xv = demean([row[field] for row in vals], groups)
        pairs = [(a, b) for a, b in zip(tv, xv) if a is not None and b is not None]
        if len(pairs) > 2:
            print("within-country corr turnout~%s: %.3f (n=%d)" % (
                field, np.corrcoef([p[0] for p in pairs], [p[1] for p in pairs])[0, 1], len(pairs)))
    # pooled and within-country OLS
    for label, sample in (("pooled", rows), ("swing-sample", clean)):
        y = [row["turnout"] for row in sample]
        c = [row["closeness"] for row in sample]
        s = [row["incumbent_swing"] for row in sample]
        inter = [row["closeness"] * row["incumbent_swing"] if row["incumbent_swing"] is not None else None for row in sample]
        print(label, "turnout~closeness", ols(y, [c])[:2])
        print(label, "turnout~closeness+swing", ols(y, [c, s])[:2])
        print(label, "turnout~closeness+swing+interaction", ols(y, [c, s, inter])[:2])
    out = {"n": len(rows), "countries": len(countries), "rows": rows}
    path = ROOT / "data" / "turnout_closeness.json"
    path.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    print("wrote", path)


if __name__ == "__main__":
    main()

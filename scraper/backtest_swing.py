#!/usr/bin/env python3
"""Backtest district-swing methods against real per-constituency results.

Uses the dpa ElectionsData API (public), which carries both the past
election and the current per-constituency results. The "forecast" uses the
actual national result as the poll average (best case), so differences
between methods are purely about how the national swing is distributed to
districts.

Methods:
  past          no change from the past district result
  uniform       now = past + (nat_now - nat_past)            (current app)
  proportional  now = past * (nat_now / nat_past)
  logit         logit(now) = logit(past) + dlogit(national)
  shrunk L      now = nat_now + L * (past - nat_past)        (L=1 == uniform)

Usage: python scraper/backtest_swing.py
"""
import json
import math
import urllib.request

API = "https://api.dpa-electionsdata.com/results?election={}&stage=live"
ELECTIONS = {"mecklenburg_vorpommern": "de_mv-2026",
             "berlin": "de_be-2026"}
ABBREV = {"SPD": "spd", "CDU": "cdu", "CSU": "cdu", "Grüne": "gruene",
          "B90/GRÜNE": "gruene", "Die Linke": "linke", "LINKE": "linke",
          "AfD": "afd", "FDP": "fdp", "BSW": "bsw"}


def fetch(el):
    req = urllib.request.Request(API.format(el),
                                 headers={"User-Agent": "600-backtest/1.0"})
    return json.loads(urllib.request.urlopen(req, timeout=60).read())


def second_votes(entry):
    for p in entry.get("percent") or []:
        if p.get("type") == "second_vote":
            v = p.get("value") or {}
            return v.get("absolute")
    return None


def shares(results, pid_map):
    out = {}
    for r in results or []:
        key = pid_map.get(r.get("target_id"))
        if not key:
            continue
        v = second_votes(r)
        if v is None:
            continue
        out[key] = out.get(key, 0) + v * 100
    return out


def project(past, nat_past, nat_now, method, lam=None):
    out = {}
    for p, past_v in past.items():
        np_ = nat_past.get(p, 0.0)
        nn = nat_now.get(p, 0.0)
        if method == "past":
            now = past_v
        elif method == "proportional" and np_ > 0.5:
            now = past_v * nn / np_
        elif method == "logit":
            def lg(x):
                x = min(max(x, 0.05), 99.95)
                return math.log(x / (100 - x))
            now = 100 / (1 + math.exp(-(lg(past_v) + lg(nn) - lg(np_))))
        elif method == "shrunk":
            now = nn + lam * (past_v - np_)
        else:  # uniform
            now = past_v + (nn - np_)
        out[p] = max(0.0, now)
    s = sum(out.values())
    if s > 0:
        out = {p: v * 100 / s for p, v in out.items()}
    return out


def evaluate(election):
    data = fetch(election)
    contest = data["election"]["contest"][0]
    pid_map = {p["id"]: ABBREV.get(p.get("abbreviation"))
               for p in data["parties"]}
    ro = contest["results_overall"]
    nat_past = shares(ro["past_election"]["results"], pid_map)
    nat_now = shares(ro["latest"]["results"], pid_map)
    parties = sorted(set(nat_past) | set(nat_now))
    methods = [("past", None), ("uniform", None), ("proportional", None),
               ("logit", None)] + \
              [("shrunk", l) for l in (0.3, 0.5, 0.6, 0.7, 0.8)]
    stats = {m: {"mae": 0.0, "win": 0, "n": 0} for m in methods}
    for pc in contest["results_per_constituency"]:
        past = shares(pc["past_election"]["results"], pid_map)
        actual = shares(pc["latest"]["results"], pid_map)
        if not past or not actual:
            continue
        # normalise actual to the modelled parties for comparability
        keys = [p for p in parties if p in actual]
        if len(keys) < 2:
            continue
        a = {p: actual.get(p, 0.0) for p in keys}
        sa = sum(a.values())
        a = {p: v * 100 / sa for p, v in a.items()}
        a_win = max(a, key=a.get)
        for m in methods:
            proj = project(past, nat_past, nat_now, m[0], m[1])
            err = sum(abs(proj.get(p, 0.0) - a[p]) for p in keys) / len(keys)
            stats[m]["mae"] += err
            stats[m]["n"] += 1
            if max(keys, key=lambda p: proj.get(p, 0.0)) == a_win:
                stats[m]["win"] += 1
    return stats


def main():
    totals = {}
    for country, el in ELECTIONS.items():
        print(f"== {country} ({el})")
        stats = evaluate(el)
        for m, s in stats.items():
            label = m[0] + (f" L={m[1]}" if m[1] is not None else "")
            mae = s["mae"] / s["n"] if s["n"] else 0
            win = s["win"] / s["n"] * 100 if s["n"] else 0
            print(f"  {label:16s} MAE {mae:5.2f}pp  winners {win:5.1f}%  "
                  f"({s['n']} districts)")
            t = totals.setdefault(m, [0.0, 0, 0])
            t[0] += s["mae"]
            t[1] += s["win"]
            t[2] += s["n"]
    print("== combined")
    for m, t in sorted(totals.items(), key=lambda kv: kv[1][0] / kv[1][2]):
        label = m[0] + (f" L={m[1]}" if m[1] is not None else "")
        print(f"  {label:16s} MAE {t[0]/t[2]:5.2f}pp  "
              f"winners {t[1]/t[2]*100:5.1f}%")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Build data/summary.json for the calendar home view.

For every visible country: the next election date (meta.json), the last
election + its winner (config lastElection), and the current poll-average
leader with its share - computed with the same math the app uses
(recency half-life, the 1500 sample cap, pollster 1/MAE weights,
excludePollsters, automatic house effects, seat-based renormalisation),
so the calendar never disagrees with the country pages.

Runs in CI after the scrapers (the output is committed with the poll data).

Usage: python scraper/build_summary.py
"""

import json
import math
import os
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "js" / "config.js"
DATA = ROOT / "data"
OUT = DATA / "summary.json"

HOUSE_SHRINK = 0.5
HOUSE_CAP = 2.5
HOUSE_MIN_POLLS = 2


def brace_block(text, start):
    depth = 0
    i = start
    while i < len(text):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return len(text) - 1


def countries(text):
    out = {}
    for m in re.finditer(r"\n  (\w+): \{", text):
        key = m.group(1)
        end = brace_block(text, m.end() - 1)
        out[key] = text[m.end() - 1:end + 1]
    return out


def field(block, name, default=None):
    m = re.search(r"\n    %s:\s*('[^']*'|\"[^\"]*\"|[\d.]+|true|false)" % name,
                  block)
    if not m:
        return default
    v = m.group(1)
    if v.startswith(("'", '"')):
        return v.strip("'\"")
    if v in ("true", "false"):
        return v == "true"
    try:
        return float(v)
    except ValueError:
        return default


def parse_pollster_mae(block):
    m = re.search(r"pollsterMAE:\s*\{", block)
    if not m:
        return {}
    end = brace_block(block, m.end() - 1)
    seg = block[m.end():end]
    out = {}
    for pm in re.finditer(r'["\']?([^"\':{}]+)["\']?\s*:\s*\{([^}]*)\}', seg):
        name = pm.group(1).strip()
        entry = {}
        for km in re.finditer(r"([\w.]+)\s*:\s*([\d.]+)", pm.group(2)):
            entry[km.group(1)] = float(km.group(2))
        if entry:
            out[name] = entry
    return out


def parse_last_election(block):
    m = re.search(r"lastElection:\s*\{", block)
    if not m:
        return None, None, None
    end = brace_block(block, m.end() - 1)
    seg = block[m.end():end]
    dm = re.search(r"date:\s*'([^']+)'", seg)
    rm = re.search(r"results:\s*\{([^}]*)\}", seg)
    winner = None
    if rm:
        vals = {k: float(v) for k, v in
                re.findall(r'"(\w+)":\s*([\d.]+)', rm.group(1))}
        if vals:
            winner = max(vals, key=vals.get)
    return (dm.group(1) if dm else None, winner, seg)


def parse_party_meta(block):
    """code/color per party + the logos map, for the calendar chips."""
    out = {}
    m = re.search(r"parties:\s*\{", block)
    if m:
        end = brace_block(block, m.end() - 1)
        for pm in re.finditer(r"(\w+):\s*\{([^}]*)\}", block[m.end():end]):
            code = re.search(r"code:\s*'([^']*)'", pm.group(2))
            color = re.search(r"color:\s*'([^']*)'", pm.group(2))
            out[pm.group(1)] = {
                "code": code.group(1) if code else pm.group(1),
                "color": color.group(1) if color else "#888",
            }
    m2 = re.search(r"logos:\s*\{", block)
    if m2:
        end2 = brace_block(block, m2.end() - 1)
        for lm in re.finditer(r"(\w+):\s*'([^']+)'", block[m2.end():end2]):
            if lm.group(1) in out:
                out[lm.group(1)]["logo"] = lm.group(2)
    return out


def recency_weight(date_str, half_life, now):
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d")
    except (TypeError, ValueError):
        return 0.0
    age = (now - d).total_seconds() / 86400
    if age <= 0:
        return 1.0
    return 0.5 ** (age / half_life)


def pollster_weight(mae, pollster, key, smooth):
    entry = mae.get(pollster)
    if not entry:
        return 1.0
    v = entry.get(key) or entry.get("overall")
    if not v:
        return 1.0
    return 1 / (1 + v) if smooth else 1 / v


def compute_avg(polls, order, mae, key, smooth, half_life, seat_based,
                seats, now):
    # automatic house effects (mirrors houseEffects() in app.js)
    cons = {}
    for p in order:
        ws = wt = 0.0
        for poll in polls:
            v = poll["votes"].get(p)
            if v is None:
                continue
            w = min(1500, poll.get("n") or 1000) * \
                recency_weight(poll["date"], half_life, now)
            ws += w * v
            wt += w
        cons[p] = ws / wt if wt else None
    acc = {}
    for poll in polls:
        a = acc.setdefault(poll["pollster"],
                           {"polls": 0, "ws": {}, "wt": {}})
        a["polls"] += 1
        for p in order:
            v = poll["votes"].get(p)
            if v is None or cons[p] is None:
                continue
            w = min(1500, poll.get("n") or 1000)
            a["ws"][p] = a["ws"].get(p, 0.0) + w * (v - cons[p])
            a["wt"][p] = a["wt"].get(p, 0.0) + w
    house = {}
    for name, a in acc.items():
        if a["polls"] < HOUSE_MIN_POLLS:
            continue
        dev = {}
        for p in order:
            if not a["wt"].get(p):
                continue
            d = max(-HOUSE_CAP, min(HOUSE_CAP,
                                    a["ws"][p] / a["wt"][p])) * HOUSE_SHRINK
            if abs(d) > 0.05:
                dev[p] = d
        if dev:
            house[name] = dev
    # weighted average
    avg = {}
    for p in order:
        ws = wt = 0.0
        for poll in polls:
            if p not in poll["votes"]:
                continue
            n = min(1500, poll.get("n") or 1000)
            w = n * pollster_weight(mae, poll["pollster"], key, smooth) * \
                recency_weight(poll["date"], half_life, now)
            v = poll["votes"][p]
            if seat_based:
                raw = sum(poll["votes"].values())
                if raw > 0:
                    v = v * seats / raw
            he = house.get(poll["pollster"])
            if he and p in he:
                v -= he[p]
            ws += w * v
            wt += w
        avg[p] = ws / wt if wt else None
    return avg


def main():
    cfg = CONFIG.read_text(encoding="utf8")
    blocks = countries(cfg)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    out = {}
    for cc, block in blocks.items():
        if field(block, "hidden", False):
            continue
        meta_path = DATA / cc / "meta.json"
        polls_path = DATA / cc / "polls.json"
        if not polls_path.is_file():
            continue
        meta = json.loads(meta_path.read_text(encoding="utf8")) \
            if meta_path.is_file() else {}
        polls_doc = json.loads(polls_path.read_text(encoding="utf8"))
        excl = re.search(r"excludePollsters:\s*\[([^\]]*)\]", block)
        excluded = re.findall(r"'([^']+)'", excl.group(1)) if excl else []
        polls = [p for p in polls_doc.get("polls", [])
                 if p.get("pollster") not in excluded]
        order = re.findall(r"'(\w+)'",
                           re.search(r"\n    order:\s*\[([^\]]*)\]",
                                     block).group(1))
        half_life = field(block, "recencyHalfLifeDays", 14) or 14
        default_days = field(block, "defaultDays", None)
        mae_key = field(block, "maeKey", "overall") or "overall"
        smooth = field(block, "maeSmooth", False)
        seat_based = field(block, "seatBased", False)
        seats = int(field(block, "seats", 0) or 0)
        mae = parse_pollster_mae(block)
        le_date, le_winner, _ = parse_last_election(block)

        # window: defaultDays, else the smallest of 30/60/90 with polls
        window = default_days
        if not window:
            for w in (30, 60, 90, 9999):
                if any((now - datetime.strptime(p["date"], "%Y-%m-%d"))
                       .days <= w for p in polls):
                    window = w
                    break
        win = [p for p in polls
               if (now - datetime.strptime(p["date"], "%Y-%m-%d")).days
               <= (window or 90)]
        avg = compute_avg(win, order, mae, str(mae_key), smooth, half_life,
                          seat_based, seats, now)
        ranked = sorted(((p, v) for p, v in avg.items() if v is not None),
                        key=lambda x: -x[1])
        latest = max((p["date"] for p in polls), default=None)
        pmeta = parse_party_meta(block)
        leader = ranked[0][0] if ranked else None
        second = ranked[1][0] if len(ranked) > 1 else None
        out[cc] = {
            "name": field(block, "name", cc),
            "election_date": meta.get("election_date"),
            "election_date_runoff": meta.get("election_date_runoff"),
            "last_election": le_date,
            "last_winner": le_winner,
            "seats": seats,
            "seat_based": seat_based,
            "leader": leader,
            "leader_pct": round(ranked[0][1], 1) if ranked else None,
            "leader_code": pmeta.get(leader, {}).get("code"),
            "leader_color": pmeta.get(leader, {}).get("color"),
            "leader_logo": pmeta.get(leader, {}).get("logo"),
            "second": second,
            "second_pct": round(ranked[1][1], 1) if len(ranked) > 1 else None,
            "last_winner_code": pmeta.get(le_winner, {}).get("code"),
            "last_winner_color": pmeta.get(le_winner, {}).get("color"),
            "poll_count": len(win),
            "latest_poll": latest,
        }
        print("%-12s %-12s leader %s %s (%d polls)" %
              (cc, out[cc]["election_date"] or "-", out[cc]["leader"],
               out[cc]["leader_pct"], len(win)))

    OUT.write_text(json.dumps({
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "countries": out,
    }, ensure_ascii=False, indent=1), encoding="utf8")
    print("wrote", OUT)


if __name__ == "__main__":
    main()

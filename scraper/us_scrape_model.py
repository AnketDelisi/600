#!/usr/bin/env python3
"""600 in-house forecast model for the 2026 U.S. midterms.

Pipeline per race:
  1. Fundamentals prior (D - R, two-party points): PVI at -1.0 (partisan lean
     maps ~1:1 onto margins, per FiftyPlusOne/Theo), plus incumbent bonus,
     blended 30/70 with the last election result where one exists.
  2. Rating band: the strongest race rating (Cook, then Inside Elections,
     then Sabato) sets a direction + strength BAND (Safe >15, Likely 7.5-15,
     Lean 2.5-7.5, Tossup <2.5, per theoelections.com); the fundamentals prior
     is clamped inside that band so safe seats reach realistic extremes while
     competitive races stay competitive.
  3. Polling blend (when a race has an aggregate/simple poll average):
       margin = 0.65 * poll_margin + 0.35 * prior_margin.
  2. Polling blend (when a race has an aggregate/simple poll average):
       margin = 0.65 * poll_margin + 0.35 * prior_margin.
3. National-swing Monte Carlo: every race shares a common environment
      shift S ~ N(env_weight * env_margin, sigma_n), where env_margin is the
      generic-ballot margin (D - R points) and env_weight = 0.5 (ratings already
      embed the environment). A race is won by the Democrats with probability
      logistic((margin + S) / beta), beta being a per-chamber residual scale.
      Chamber seat tallies are accumulated across 20k simulated nights to
      produce per-race win probabilities and seat distributions. Per-race
      win probabilities (dem_pct) are reported at the swing mean (S = mean).

Chamber majority thresholds: Senate 50 (current D-caucus 47 vs R 53),
House 218 seats, Governors shows an expected Dem/Rep count only.
"""

import json
import math
import random
from datetime import datetime, timezone
from pathlib import Path

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "us"
RNG = random.Random(20260908)
N_SIMS = 20000

# point margins by rating word -> (cook, ie, sabato) synonyms
RATING_MARGIN = {
    "solid": 22.0, "safe": 22.0, "likely": 10.0, "lean": 6.0, "leans": 6.0,
    "tilt": 3.0, "tossup": 0.0,
}
RATING_ORDER = ("cook", "ie", "sabato")
# logistic slope for win probability
LOGISTIC_BETA = {"senate": 4.0, "house": 4.5, "governor": 4.0}
NATIONAL_SIGMA = 2.5
POLL_WEIGHT = 0.65
# generic-ballot margin enters the national swing at half weight: race ratings
# (Cook/IE/Sabato) already embed the current environment, so using the full
# margin on top would double-count it.
ENV_WEIGHT = 0.5

# current chamber state (D-caucus includes independents)
COMP_START = {
    "senate": {"d": 47, "r": 53},
    "house": {"d": 215, "r": 220},
    "governor": {"d": 18, "r": 18},
}
MAJORITY = {"senate": 50, "house": 218}


def rating_band(raw):
    """Rating -> (lo, hi, center) margin band, thresholds following Theo/FPO.

    The rating sets the direction and strength (a band of plausible D-R
    margins), while the fundamentals prior (PVI + last result) places the race
    continuously inside that band. Thresholds mirror theoelections.com:
    Safe >15, Likely 7.5-15, Lean 2.5-7.5, Tossup <2.5.
    """
    if not raw:
        return None
    word = raw.lower().split("(")[0].strip()
    toks = word.split()
    if not toks:
        return None
    strength = toks[0]
    if strength in ("safe", "solid"):
        strength = "solid"
    elif strength in ("lean", "leans"):
        strength = "lean"
    party = toks[-1] if len(toks) > 1 else ""
    if strength == "tossup":
        return (-2.5, 2.5, 0.0)
    key = f"{strength} {party}"
    BANDS = {
        "solid d": (15.0, 35.0, 22.0),
        "likely d": (7.5, 15.0, 10.0),
        "lean d": (2.5, 7.5, 5.0),
        "tilt d": (1.0, 3.0, 2.0),
        "tilt r": (-3.0, -1.0, -2.0),
        "lean r": (-7.5, -2.5, -5.0),
        "likely r": (-15.0, -7.5, -10.0),
        "solid r": (-35.0, -15.0, -22.0),
    }
    return BANDS.get(key)


def rating_margin(ratings):
    """Center of the strongest rating band (informational; not used as the margin)."""

    def to_center(raw):
        b = rating_band(raw)
        return b[2] if b else None

    for key in RATING_ORDER:
        m = to_center((ratings or {}).get(key))
        if m is not None:
            return m
    return None


def pvi_margin(pvi):
    """Fundamentals prior from PVI (PVI positive leans Republican).

    Partisan lean maps roughly one-to-one onto margins (FiftyPlusOne; Theo),
    so the prior is -1.0 * PVI (not -0.5, which understated safe seats).
    """
    return -1.0 * pvi


def last_margin(race):
    """Two-party margin (D - R points) implied by the last election result."""
    last = race.get("last")
    if not last or last.get("pct") is None:
        return None
    margin = last["pct"] - (100 - last["pct"])
    return margin if last.get("party") == "D" else -margin


def fundamentals_margin(race, chamber):
    """Blend PVI (30%) with the last election result (70%) where available."""
    pv = pvi_margin(race.get("pvi") or 0.0)
    if race.get("party"):
        pv += 1.5 if race["party"] == "D" else -1.5
    last = last_margin(race)
    if last is not None:
        return 0.7 * last + 0.3 * pv
    return pv


def final_margin(race, polls, chamber):
    band = rating_band(next((v for v in ((race.get("ratings") or {}).get(k) for k in RATING_ORDER) if v), None))
    rm = fundamentals_margin(race, chamber)
    if band is not None:
        lo, hi, _ = band
        rm = max(lo, min(hi, rm))
    if polls:
        pm = polls["dem"] - polls["rep"]
        rm = POLL_WEIGHT * pm + (1 - POLL_WEIGHT) * rm
    return rm


def lean(m):
    if m >= 15: return "Solid D"
    if m >= 7.5: return "Likely D"
    if m >= 2.5: return "Lean D"
    if m > -2.5: return "Tossup"
    if m > -7.5: return "Lean R"
    if m > -15: return "Likely R"
    return "Solid R"


def best_rating(race):
    ratings = race.get("ratings") or {}
    for key in RATING_ORDER:
        if ratings.get(key):
            return ratings[key]
    return None


def run(chamber, races, poll_map, env_margin):
    beta = LOGISTIC_BETA[chamber]
    margins = {}
    polls_used = {}
    for r in races:
        label = (r["state"].replace("_", " "), r.get("district", ""))
        if chamber == "house":
            label_key = label[0] + " " + label[1]
        else:
            label_key = label[0]
        polls = poll_map.get(label_key) if poll_map else None
        m = final_margin(r, polls, chamber)
        margins[label_key] = m
        polls_used[label_key] = polls

    out_races = []
    total = {"senate": 100, "house": 435, "governor": len(races)}[chamber]
    up_d = sum(1 for r in races if r.get("party") in ("D", "I"))
    # Seats not up this cycle = current D-caucus minus D-held seats that ARE up.
    # `up_d` only counts races with a D/I party tag; open seats (party=null) are
    # still up and contestable, so in a chamber where every seat is on the ballot
    # (House midterm: all 435, Governors: all 36) the not-up baseline is 0. The
    # previous `current_d - up_d` wrongly locked in D-caucus seats whose race was
    # open (party=null) as if they were not up, inflating House D seats by ~9.
    if len(races) >= total:
        not_up_d = 0
    else:
        not_up_d = COMP_START[chamber]["d"] - up_d
    seatz = [0] * (N_SIMS)
    swing_mean = ENV_WEIGHT * (env_margin or 0.0)
    for i in range(N_SIMS):
        S = RNG.gauss(swing_mean, NATIONAL_SIGMA)
        wins = 0
        for k, m in margins.items():
            # logistic win probability, shifted by the common national swing
            p = 1.0 / (1.0 + math.exp(-(m + S) / beta))
            if RNG.random() < p:
                wins += 1
        seatz[i] = not_up_d + wins

    dist = [0.0] * (total + 1)
    for s in seatz:
        dist[min(s, total)] += 1
    dist = [round(100.0 * n / N_SIMS, 1) for n in dist]

    for r in races:
        label_key = (r["state"].replace("_", " "), r.get("district", ""))
        if chamber == "house":
            label_key = label_key[0] + " " + label_key[1]
        else:
            label_key = label_key[0]
        m = margins[label_key]
        md = 1.0 / (1.0 + math.exp(-(m + swing_mean) / beta))
        out_races.append({
            "state": r["state"].replace("_", " "),
            "district": r.get("district", ""),
            "incumbent": (r.get("incumbent") or "").split("(")[0].strip(),
            "party": r.get("party"),
            "rating": best_rating(r),
            "lean": lean(m),
            "margin": round(m, 1),
            "dem_pct": round(100 * md, 1),
            "rep_pct": round(100 * (1 - md), 1),
            "polls": polls_used[label_key],
        })
    out_races.sort(key=lambda x: (-abs(x["margin"])))

    need = MAJORITY.get(chamber)
    if need is None:
        dem_share = rep_share = 0.0
    else:
        dem_share = sum(1 for s in seatz if s >= need) / N_SIMS
        rep_share = 1.0 - dem_share
    expected = sum(seatz) / N_SIMS
    return {
        "races": out_races,
        "expected_d_seats": round(expected, 1),
        "expected_r_seats": round(total - expected, 1),
        "majority": {
            "dem_pct": round(100 * dem_share, 1),
            "rep_pct": round(100 * rep_share, 1),
        },
        "distribution_buckets": _buckets(dist) if chamber != "governor" else None,
    }


def _buckets(dist):
    """compress sparse seat-distribution into 2-seat buckets (center values)."""
    out = []
    for lo in range(0, len(dist), 2):
        s = sum(dist[lo:lo + 2])
        if s:
            out.append({"seats": lo + 1, "pct": round(s, 1)})
    return out


def main():
    base = json.loads((OUTPUT_DIR / "races.json").read_text(encoding="utf-8"))
    polls = json.loads((OUTPUT_DIR / "polling.json").read_text(encoding="utf-8"))
    gb = [g for g in base.get("generic_ballot") or [] if g["pollster"].lower() != "average"]
    env = round(sum(g["dem"] - g["rep"] for g in gb) / len(gb), 1) if gb else None

    result = {
        "model": "600 in-house model — rating+poll informed, national-swing Monte Carlo",
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "environment": {
            "generic_ballot_generic_margin": env,
            "n_sims": N_SIMS,
            "rating_margin_table": RATING_MARGIN,
            "margin_method": "PVI prior placed inside rating band (rating sets direction+strength, PVI gives continuous margin)",
            "national_swing_sigma": NATIONAL_SIGMA,
        },
        "senate": run("senate", base["races"]["senate"], polls["senate"], env),
        "house": run("house", base["races"]["house"], None, env),
        "governor": run("governor", base["races"]["governor"], polls["governor"], env),
    }
    out_file = OUTPUT_DIR / "forecast.json"
    out_file.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {out_file}")
    for ch in ("senate", "house", "governor"):
        r = result[ch]
        print(f"{ch}: expected D {r['expected_d_seats']}, " + (f"D maj {r['majority']['dem_pct']}%" if ch != 'governor' else f"D {r['majority']['dem_pct']}"))


if __name__ == "__main__":
    main()
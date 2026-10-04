#!/usr/bin/env python3
"""600 in-house forecast model for the 2026 U.S. midterms.

Pipeline per race:
  1. Fundamentals prior (D - R, two-party points): PVI at -1.0 (partisan lean
     maps ~1:1 onto margins, per FiftyPlusOne/Theo), plus incumbent bonus,
     blended with the last election result (70% for held seats, 40% for open
     seats — retiring/term-limited incumbents take their personal vote with
     them, so the structural PVI dominates).
  2. Rating band: the strongest race rating (Cook, then Inside Elections,
     then Sabato) sets a direction + strength BAND (Safe >15, Likely 7.5-15,
     Lean 2.5-7.5, Tossup <2.5, per theoelections.com); the fundamentals prior
     is clamped inside that band so safe seats reach realistic extremes while
     competitive races stay competitive.
3. Polling blend (when a race has an aggregate/simple poll average):
     margin = 0.65 * poll_margin + 0.35 * prior_margin. Races with a serious
     independent on the ballot (Nebraska/Idaho/South Dakota/Montana Senate,
     Alaska's at-large House seat) skip the D-R prior entirely: their sides
     come straight from the poll shares, since the D-R rating bands do not
     describe them.
  4. National-swing Monte Carlo: every race shares a common environment
     shift S ~ N(env_weight * env_margin, sigma_n), where env_margin is the
     generic-ballot margin (D - R points). env_weight is chamber-specific
     (0.25 for rated races, 1.0 for unrated; polls/ratings already embed the
     environment). A race is won by the side with the highest softmax
     probability softmax(share/beta) — for two sides this is exactly the
     previous logistic((margin + S)/beta). Races without a Democrat get the
     national shock only. Chamber seat tallies count Democrats, Republicans
     and independents separately across 20k simulated nights; majority
     probabilities require a party to reach the threshold on its own (an
     independent win counts for neither side — conservative for Democrats).
     Per-race win probabilities are reported at the swing mean.

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
# generic-ballot margin enters the national swing at a chamber-specific weight:
# race ratings (Cook/IE/Sabato) and polls already embed the current environment,
# so using the full margin on top would double-count it. The Senate is far less
# nationalized than the House (state-by-state races, heavier polling), so its
# environment weight is smaller.
ENV_WEIGHT = {"senate": 0.25, "house": 0.25, "governor": 0.25}
# races WITHOUT a rating use PVI alone, which is a neutral-year lean — the full
# generic-ballot environment applies to them.
UNRATED_ENV_WEIGHT = {"senate": 1.0, "house": 1.0, "governor": 1.0}
# last-election result weight in the fundamentals; open seats (retiring /
# term-limited / new) lose most of the incumbent's personal vote, so their
# prior leans more on the structural PVI.
LAST_WEIGHT = 0.7
OPEN_SEAT_LAST_WEIGHT = 0.4

# current chamber state (D-caucus includes independents)
COMP_START = {
    "senate": {"d": 47, "r": 53},
    "house": {"d": 215, "r": 220},
    "governor": {"d": 18, "r": 18},
}
MAJORITY = {"senate": 51, "house": 218}
# 14 governorships are not up in 2026 (current split: 6 D / 8 R); the totals
# reported for governors include these so the numbers cover all 50 governors.
GOV_NOT_UP = {"d": 6, "r": 8}


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


def is_open_seat(race):
    inc = (race.get("incumbent") or "").lower()
    return (
        "retiring" in inc or "term-limited" in inc or "not seeking" in inc
        or not inc or inc == "none (new seat)" or inc == "vacant"
    )


def fundamentals_margin(race, chamber):
    """Blend PVI with the last election result.

    Open seats (retiring/term-limited/new incumbents) get less weight on the
    last result: the incumbent's personal vote largely disappears, so the
    structural PVI dominates. Held seats keep the stronger last-result signal.
    """
    pv = pvi_margin(race.get("pvi") or 0.0)
    if race.get("party"):
        pv += 1.5 if race["party"] == "D" else -1.5
    last = last_margin(race)
    if last is not None:
        w = OPEN_SEAT_LAST_WEIGHT if is_open_seat(race) else LAST_WEIGHT
        return w * last + (1 - w) * pv
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


def lean_from(leader, margin_abs):
    """Lean label from the leader's perspective (works for D/R/I leaders)."""
    if margin_abs >= 15:
        band = "Solid"
    elif margin_abs >= 7.5:
        band = "Likely"
    elif margin_abs >= 2.5:
        band = "Lean"
    else:
        return "Tossup"
    return "%s %s" % (band, leader)


def race_sides(race, polls, chamber):
    """Return (sides, names, polled_independent).

    Races with a serious independent on the ballot (Nebraska's Dan Osborn,
    Idaho's Todd Achilles, South Dakota's Brian Bengs, Montana's Seth Bodnar,
    Alaska's at-large House race) are not Democrat-vs-Republican, so the
    D-R rating bands don't describe them: their sides come straight from the
    poll shares (normalized). Everything else keeps the fundamentals+rating
    two-way margin.
    """
    sv = {}
    if polls:
        for party, key in (("D", "dem"), ("R", "rep"), ("I", "ind")):
            v = polls.get(key)
            if v is not None and v > 0:
                sv[party] = v
    if "I" in sv and len(sv) >= 2:
        tot = sum(sv.values())
        return ({k: 100.0 * v / tot for k, v in sv.items()},
                (polls.get("names") or {}), True)
    m = final_margin(race, polls, chamber)
    return {"D": 50.0 + m / 2, "R": 50.0 - m / 2}, {}, False


def run(chamber, races, poll_map, env_margin):
    beta = LOGISTIC_BETA[chamber]
    sides = {}
    names = {}
    rated = {}
    polls_used = {}
    for r in races:
        label = (r["state"].replace("_", " "), r.get("district", ""))
        if chamber == "house":
            label_key = label[0] + " " + label[1]
        else:
            label_key = label[0]
        polls = poll_map.get(label_key) if poll_map else None
        sh, nm, polled_ind = race_sides(r, polls, chamber)
        sides[label_key] = sh
        names[label_key] = nm
        polls_used[label_key] = polls
        # polled independent races: the polls embed the environment, so use
        # the small rated weight; otherwise the rating presence decides
        rated[label_key] = True if polled_ind else (best_rating(r) is not None)

    def adj_margin(sh, swing, swing_party):
        """Leader-minus-runner margin (positive = leader ahead) after applying
        the national swing along its axis: a positive swing helps the
        Democrats, so for an R-led race it shrinks the Republican margin."""
        keys = sorted(sh, key=lambda k: -sh[k])
        margin = sh[keys[0]] - sh[keys[1]]
        if swing_party == keys[0]:
            margin += swing
        elif swing_party == keys[1]:
            margin -= swing
        return keys, margin

    def win_probs(sh, swing, swing_party):
        """Softmax win probabilities at a given national swing.

        For two sides this is exactly logistic((share_l - share_r)/beta),
        the previous model; with an independent it extends naturally.
        """
        keys, margin = adj_margin(sh, swing, swing_party)
        l, r = keys[0], keys[1]
        third = keys[2] if len(keys) > 2 else None
        tot = 100.0 - (sh[third] if third else 0.0)
        adj = {l: tot / 2 + margin / 2, r: tot / 2 - margin / 2}
        if third:
            adj[third] = sh[third]
        w = {k: math.exp(v / beta) for k, v in adj.items()}
        s = sum(w.values())
        return {k: v / s for k, v in w.items()}

    total = {"senate": 100, "house": 435, "governor": len(races)}[chamber]
    up_d = sum(1 for r in races if r.get("party") in ("D", "I"))
    if len(races) >= total:
        not_up_d = 0
    else:
        not_up_d = COMP_START[chamber]["d"] - up_d
    not_up_r = (total - len(races)) - not_up_d
    env = env_margin or 0.0
    rated_env = ENV_WEIGHT[chamber] * env
    unrated_env = UNRATED_ENV_WEIGHT[chamber] * env

    seatz_d = [0] * N_SIMS
    seatz_r = [0] * N_SIMS
    seatz_i = [0] * N_SIMS
    for i in range(N_SIMS):
        Z = RNG.gauss(0.0, NATIONAL_SIGMA)
        dw = rw = iw = 0
        for k, sh in sides.items():
            mu = rated_env if rated[k] else unrated_env
            # the national environment moves the Democrat-against-the-field
            # margin; a race with no Democrat (Nebraska/Idaho R-vs-I) gets
            # the national shock only: the generic ballot says little about
            # Republican-vs-Independent
            if "D" in sh:
                swing, swing_party = mu + Z, "D"
            else:
                swing, swing_party = Z, "R"
            probs = win_probs(sh, swing, swing_party)
            u = RNG.random()
            acc = 0.0
            for party, p in probs.items():
                acc += p
                if u <= acc:
                    if party == "D":
                        dw += 1
                    elif party == "R":
                        rw += 1
                    else:
                        iw += 1
                    break
        seatz_d[i] = not_up_d + dw
        seatz_r[i] = not_up_r + rw
        seatz_i[i] = iw

    dist = [0.0] * (total + 1)
    for s in seatz_d:
        dist[min(s, total)] += 1
    dist = [round(100.0 * n / N_SIMS, 1) for n in dist]

    out_races = []
    for r in races:
        label_key = (r["state"].replace("_", " "), r.get("district", ""))
        if chamber == "house":
            label_key = label_key[0] + " " + label_key[1]
        else:
            label_key = label_key[0]
        sh = sides[label_key]
        mu = rated_env if rated[label_key] else unrated_env
        swing, swing_party = (mu, "D") if "D" in sh else (0.0, "R")
        probs = win_probs(sh, swing, swing_party)
        keys, margin = adj_margin(sh, swing, swing_party)
        leader = keys[0]
        margin = round(margin, 1)
        nm = names[label_key]
        out_races.append({
            "state": r["state"].replace("_", " "),
            "district": r.get("district", ""),
            "incumbent": (r.get("incumbent") or "").split("(")[0].strip(),
            "party": r.get("party"),
            "rating": best_rating(r),
            "lean": lean_from(leader, margin),
            "leader": leader,
            "margin": margin,
            "dem_pct": round(100 * probs.get("D", 0.0), 1),
            "rep_pct": round(100 * probs.get("R", 0.0), 1),
            "ind_pct": round(100 * probs.get("I", 0.0), 1),
            "dem_name": nm.get("d"),
            "rep_name": nm.get("r"),
            "ind_name": nm.get("i"),
            "polls": polls_used[label_key],
        })
    out_races.sort(key=lambda x: (-abs(x["margin"])))

    need = MAJORITY.get(chamber)
    if need is None:
        dem_share = rep_share = 0.0
    else:
        dem_share = sum(1 for s in seatz_d if s >= need) / N_SIMS
        rep_share = sum(1 for s in seatz_r if s >= need) / N_SIMS
    expected = sum(seatz_d) / N_SIMS
    expected_i = sum(seatz_i) / N_SIMS
    res = {
        "races": out_races,
        "expected_d_seats": round(expected, 1),
        "expected_r_seats": round(total - expected - expected_i, 1),
        "expected_i_seats": round(expected_i, 1),
        "majority": {
            "dem_pct": round(100 * dem_share, 1),
            "rep_pct": round(100 * rep_share, 1),
        },
        "distribution_buckets": _buckets(dist) if chamber != "governor" else None,
    }
    if chamber == "governor":
        res["total_d_governors"] = round(expected + GOV_NOT_UP["d"], 1)
        res["total_r_governors"] = round(
            (total - expected - expected_i) + GOV_NOT_UP["r"], 1)
    return res


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
            "env_weights": ENV_WEIGHT,
        },
        "senate": run("senate", base["races"]["senate"], polls["senate"], env),
        "house": run("house", base["races"]["house"], polls.get("house"), env),
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
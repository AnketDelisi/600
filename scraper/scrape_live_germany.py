"""Election-night live snapshot for Berlin + Mecklenburg-Vorpommern.

Pulls the dpa ElectionsData API (public, no key) and writes the normalized
live.json both countries' LIVE tab reads (data/{c}/live.json and the bmv copy).

Sources:
  https://api.dpa-electionsdata.com/results?election=de_be-2026&stage=live
  https://api.dpa-electionsdata.com/results?election=de_mv-2026&stage=live

Usage: python scraper/scrape_live_germany.py [--dry-run]
"""
import argparse, json, os, sys, urllib.request

ROOT = os.path.join(os.path.dirname(__file__), "..")
API = "https://api.dpa-electionsdata.com/results?election={}&stage=live"

# dpa party abbreviation -> our config party key. Anything else -> other.
ABBREV = {
    "SPD": "spd", "CDU": "cdu", "CSU": "cdu", "Gr\u00fcne": "gruene",
    "B90/GR\u00dcNE": "gruene", "Die Linke": "linke", "LINKE": "linke",
    "AfD": "afd", "FDP": "fdp", "BSW": "bsw",
}
ELECTIONS = {
    "berlin": "de_be-2026",
    "mecklenburg_vorpommern": "de_mv-2026",
}
# dpa district count for progress % (Wahlbezirke that report on election night)
TOTAL_DISTRICTS = {"berlin": 78, "mecklenburg_vorpommern": 36}


def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "600-election-night/1.0", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf8", "replace"))


def absv(v):
    """Unwrap dpa's {type,min,max,absolute} value wrapper."""
    if isinstance(v, dict):
        if v.get("absolute") is not None:
            return v["absolute"]
        return v.get("value")
    return v


def normalize(country, data):
    contest = data["election"]["contest"][0]
    ro = (contest.get("results_overall") or {})
    latest = ro.get("latest") or {}
    progress = ro.get("counting_progress") or {}
    parties = {p["id"]: p.get("abbreviation") or "" for p in data.get("parties", [])}

    def extract(snapshot):
        """party pct by our key from a dpa result snapshot."""
        out = {}
        for r in (snapshot.get("results") or []):
            pid = r.get("target_id") or ""
            key = ABBREV.get(parties.get(pid, ""))
            if not key:
                continue
            pct = None
            for p in r.get("percent") or []:
                if p.get("type") == "second_vote":
                    pct = absv(p.get("value"))
            if pct is not None:
                out[key] = float(pct)
        return out

    # Exit polls (FGW / Infratest dimap) — published at 18:00 CET as
    # results_per_type.exit_poll (or the latest snapshot when its type is
    # exit_poll/trend and no official count exists yet).
    exit_poll = {}
    rpt = ro.get("results_per_type") or {}
    for snap in rpt.get("exit_poll") or []:
        exit_poll = extract(snap)
    if not exit_poll and latest.get("type") in ("exit_poll", "projection"):
        exit_poll = extract(latest)

    turnout = None
    votes = None
    eligible = None
    info = latest.get("additional_information") or {}
    if info.get("turnout") is not None:
        turnout = float(info["turnout"])
    if info.get("voters") is not None:
        eligible = float(info["voters"])
    # second_vote = the list vote (our model is list-based)
    for v in info.get("votes") or []:
        if v.get("type") == "second_vote":
            votes = float(v.get("value") or 0)

    by = {}
    for r in latest.get("results") or []:
        pid = r.get("target_id") or ""
        abbrev = parties.get(pid, "")
        key = ABBREV.get(abbrev)
        if not key or key == "other":
            continue
        pct = None
        for p in r.get("percent") or []:
            if p.get("type") == "second_vote":
                pct = absv(p.get("value"))
        seats = None
        if r.get("seats"):
            seats = absv(r["seats"].get("absolute"))
        by[key] = {"pct": (float(pct) if pct is not None else None),
                   "votes": None, "seats": seats}

    current = progress.get("current")
    total = progress.get("max")
    if not total:
        total = TOTAL_DISTRICTS.get(country)
    counted = current if current is not None else 0
    if total and counted > total:
        total = counted

    return {
        "source": "dpa-electionsdata",
        "election": "2026-09-20",
        "exit_poll": exit_poll,
        "national": {
            "counted": counted,
            "totalDistricts": total,
            "turnout": turnout,
            "votes": votes,
            "eligible": eligible,
            "updatedAt": latest.get("status_date"),
            "parties": [{"code": k, "votes": v["votes"], "pct": v["pct"]} for k, v in by.items()],
            "seats": [{"code": k, "seats": v["seats"]} for k, v in by.items() if v["seats"] is not None],
        },
        "valkretsar": [],
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    for country, election in ELECTIONS.items():
        try:
            data = fetch_json(API.format(election))
            out = normalize(country, data)
        except Exception as e:
            print(f"{country}: FAILED ({e})", flush=True)
            continue
        n = out["national"]
        print(f"{country}: counted {n['counted']}/{n['totalDistricts']} "
              f"turnout {n['turnout']} parties {len(n['parties'])} "
              f"updated {n['updatedAt']}", flush=True)
        if n["counted"] == 0 and not out["exit_poll"]:
            print(f"{country}: nothing counted yet — leaving live.json untouched", flush=True)
            continue
        if args.dry_run:
            print(json.dumps(out, ensure_ascii=False)[:400], flush=True)
            continue
        for dest in (os.path.join(ROOT, "data", country, "live.json"),
                     os.path.join(ROOT, "bmv", "data", country, "live.json")):
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with open(dest, "w", encoding="utf8") as f:
                json.dump(out, f, ensure_ascii=False)
        print(f"{country}: wrote live.json", flush=True)
        # Exit poll slots: valu.json (FGW) and novus.json (Infratest dimap)
        # both carry the same dpa exit poll; the LIVE tab maps them to the
        # configured FGW/ID columns.
        if out["exit_poll"]:
            ep = {"parties": out["exit_poll"]}
            for fname in ("valu.json", "novus.json"):
                for dest in (os.path.join(ROOT, "data", country, fname),
                             os.path.join(ROOT, "bmv", "data", country, fname)):
                    with open(dest, "w", encoding="utf8") as f:
                        json.dump(ep, f, ensure_ascii=False)
            print(f"{country}: wrote exit poll slots (valu/novus)", flush=True)


if __name__ == "__main__":
    main()
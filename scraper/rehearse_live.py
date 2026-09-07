"""P2 rehearsal: generate progressive live.json snapshots simulating an election
night count so we can verify the LIVE tab updates (ticker %, map colors, seats).

Works on the normalized shape that the LIVE tab consumes (data/sweden/live.json
as written by scrape_live_sweden.py).

Usage:
  python scraper/rehearse_live.py reset   # restore real 2022 final (normalized)
  python scraper/rehearse_live.py 0|1|2|3 # 0 / 20 / 50 / 90 % counted (synthetic)
"""
import json, os, sys, random
from scrape_live_sweden import normalize, fetch_json, OUT, BASE

VALKRETS = [f"{k:02d}" for k in range(1, 30)]
PARTIES = ["S", "SD", "M", "V", "C", "KD", "MP", "L"]

def real_data():
    nat = fetch_json(f"{BASE}/val2022/RD_S.json")
    out = {"source": "valmyndigheten", "election": "val2022",
           "national": normalize(nat), "valkretsar": []}
    for k in VALKRETS:
        try:
            out["valkretsar"].append(normalize(fetch_json(f"{BASE}/val2022/RD_{k}_S.json")))
        except Exception:
            out["valkretsar"].append(None)
    return out

def synth_parties(real_parties, fraction, rnd):
    """2026-rehearsal scenario: SD surges, S/M slide, so near-tied districts
    flip as counting completes — visibly exercising the map + seats updates."""
    scenario = {"S": -3.2, "SD": +5.5, "M": -1.8, "V": +0.9, "C": -0.4,
                "KD": -0.4, "MP": +0.5, "L": -0.5}
    out = []
    for p in real_parties:
        if p["code"] not in PARTIES:
            continue
        shift = scenario.get(p["code"], 0)
        noise = rnd.uniform(-0.9, 0.9) * (1 - fraction)
        out.append({"code": p["code"], "votes": p.get("votes"),
                    "pct": max(0.0, round((p["pct"] or 0) + shift * fraction + noise, 2))})
    total = sum(x["pct"] for x in out)
    if total > 0:
        for x in out:
            x["pct"] = round(x["pct"] / total * 100, 2)
    return out

def main():
    stage = sys.argv[1] if len(sys.argv) > 1 else "reset"
    if stage == "reset":
        out = real_data()
        with open(OUT, "w", encoding="utf8") as f:
            json.dump(out, f, ensure_ascii=False)
        print("reset to real 2022 final (normalized)")
        return

    fraction = {0: 0.0, 1: 0.2, 2: 0.5, 3: 0.9}[int(stage)]
    rnd = random.Random(42 + int(stage))
    real = real_data()

    nat = real["national"]
    nat["counted"] = int(nat["totalDistricts"] * fraction)
    nat["parties"] = synth_parties(nat["parties"], fraction, rnd)
    nat["turnout"] = round((nat["turnout"] or 0) * (0.55 + 0.45 * fraction), 2)

    for v in real["valkretsar"]:
        if not v:
            continue
        v["counted"] = int(v["totalDistricts"] * fraction)
        v["parties"] = synth_parties(v["parties"], fraction, rnd)
        # re-allocate this valkrets's seats from the shifted pcts when enough
        # is counted, so the parliament diagram changes during the evening
        if fraction >= 0.5 and v["seats"]:
            total_fasta = sum(s["seats"] for s in v["seats"])
            alloc = {}
            for p in v["parties"]:
                alloc[p["code"]] = 0
            # Sainte-Lague on pct over the valkrets fasta seats
            qs = []
            for p in v["parties"]:
                if p["pct"] <= 0:
                    continue
                for d in (1.2,) + tuple(range(3, 2 * total_fasta + 1, 2)):
                    qs.append((p["pct"] / d, p["code"]))
            qs.sort(key=lambda x: -x[0])
            for i in range(total_fasta):
                alloc[qs[i][1]] = alloc.get(qs[i][1], 0) + 1
            v["seats"] = [{"code": c, "seats": n} for c, n in alloc.items() if n > 0]

    with open(OUT, "w", encoding="utf8") as f:
        json.dump(real, f, ensure_ascii=False)
    print("stage", stage, "->", int(fraction * 100), "% counted")
    # report who leads per valkrets so we can eyeball map changes
    lead = {}
    for v in real["valkretsar"]:
        if v and v["parties"]:
            top = max(v["parties"], key=lambda p: p["pct"])
            lead[top["code"]] = lead.get(top["code"], 0) + 1
    print("valkrets leaders:", lead)

if __name__ == "__main__":
    main()
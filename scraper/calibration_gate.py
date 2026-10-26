#!/usr/bin/env python3
"""Score the 2026 live races against the app's real forecast probabilities."""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
POST = json.loads((ROOT / "data" / "postmortem.json").read_text(encoding="utf8"))
ACTUAL = json.loads((ROOT / "data" / "election_results.json").read_text(encoding="utf8"))
RACES = {"serbia": "serbia", "bgpres": "bgpres", "brazil": "brazil"}


def forecast(cc, votes):
    out = subprocess.run(
        ["node", "scraper/forecast_run.js", cc, json.dumps(votes), "2000", "20"],
        cwd=ROOT, capture_output=True, text=True, encoding="utf8", check=True)
    return json.loads(out.stdout)


def seats(cc, votes):
    out = subprocess.run(
        ["node", "scraper/seats_run.js", cc, json.dumps(votes)],
        cwd=ROOT, capture_output=True, text=True, encoding="utf8", check=True)
    return json.loads(out.stdout)


def main():
    cases = []
    for key, cc in RACES.items():
        actual = ACTUAL[key]
        result = forecast(cc, POST[key]["poll_average"])
        n = result["nSims"]
        largest = result["largest"]
        predicted = max(largest, key=largest.get)
        actual_winner = max(actual["shares"], key=actual["shares"].get)
        p = largest[predicted] / n
        case = {
            "race": key,
            "poll_average": POST[key]["poll_average"],
            "predicted": predicted,
            "actual": actual_winner,
            "probability": round(p, 3),
            "hit": predicted == actual_winner,
        }
        if cc == "serbia":
            actual_seats = seats(cc, actual["shares"])
            opp = sum(v for k, v in actual_seats.items()
                      if k in ("sl", "pes", "nada", "misn", "spp", "sda", "sdp", "kshlp"))
            case["majority"] = {
                "predicted_opp": round(result["maj"].get("td", 0) / n, 3),
                "actual_opp_seats": opp,
                "actual_opp_majority": opp >= 126,
            }
        cases.append(case)
    brier = sum((c["probability"] - (1 if c["hit"] else 0)) ** 2 for c in cases) / len(cases)
    out = {
        "n": len(cases),
        "brier": round(brier, 4),
        "cases": cases,
        "note": "Three completed 2026 races; a diagnostic gate, not enough alone to recalibrate.",
    }
    (ROOT / "data" / "calibration_gate.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    print(json.dumps(out, ensure_ascii=False, indent=1))
    if brier > 0.30:
        raise SystemExit("calibration gate failed: Brier %.3f > 0.30" % brier)


if __name__ == "__main__":
    main()

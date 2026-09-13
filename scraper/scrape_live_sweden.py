"""Election-night live snapshot for Sweden (GitHub Actions fallback layer).

Pulls Valmyndigheten's preliminary feed (resultat.val.se/data/resultat/val2026/RD_P.json
+ per-valkrets RD_<nn>_P.json) and writes a compact data/sweden/live.json.
If Valmyndigheten is unreachable, falls back to Aftonbladet's SvelteKit data
endpoint (__data.json), which aggregates the same official count (national level
only — no per-valkrets breakdown). The LIVE tab reads this directly (static
fallback) or via the Cloudflare worker.

Usage: python scraper/scrape_live_sweden.py [--year 2026]
"""
import argparse, json, os, sys, urllib.request

BASE = "https://resultat.val.se/data/resultat"
AB_URL = "https://www.aftonbladet.se/valresultat/2026/riksdagsval/__data.json"
VALKRETS = [f"{k:02d}" for k in range(1, 30)]
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "sweden", "live.json")

def fetch_json(url):
    req = urllib.request.Request(url, headers={
        "User-Agent": "600-election-night/1.0", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf8", "replace"))

def pct_num(v):
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v or "").replace("%", "").replace(" ", "").replace(",", ".")
    try:
        n = float(s)
        return n if n == n else None
    except ValueError:
        return None

def num(v):
    s = str(v or "").replace(" ", "")
    if isinstance(v, (int, float)):
        return int(v)
    d = "".join(ch for ch in s if ch.isdigit())
    return int(d) if d else 0

def normalize(feed):
    parties = (feed.get("rosterPaverkaMandat") or {}).get("partiroster") or []
    seats = feed.get("partiMandat") or []
    return {
        "counted": feed.get("antalValdistriktRaknade"),
        "totalDistricts": feed.get("antalValdistriktSomSkaRaknas"),
        "turnout": pct_num(feed.get("valdeltagande")),
        "votes": num(feed.get("totaltAntalRoster")),
        "eligible": num(feed.get("antalRostberattigade")),
        "updatedAt": feed.get("senasteRapporteringstid") or feed.get("senasteUppdateringstid"),
        "parties": [{"code": p.get("partiforkortning"), "votes": p.get("antalRoster"),
                     "pct": pct_num(p.get("andelRoster"))} for p in parties],
        "seats": [{"code": p.get("partiforkortning"), "seats": p.get("antalMandat")} for p in seats],
    }

def deref(arr, i, depth=0):
    """Resolve a SvelteKit __data.json reference table (values are array indices)."""
    if depth > 10:
        return None
    v = arr[i]
    while isinstance(v, int):
        if v < 0 or v >= len(arr):
            return None
        v = arr[v]
    if isinstance(v, dict):
        return {k: deref(arr, x, depth + 1) for k, x in v.items()}
    if isinstance(v, list):
        return [deref(arr, x, depth + 1) for x in v]
    return v

def fetch_ab():
    """Normalized national results from Aftonbladet's __data.json (all-null pre-close)."""
    raw = fetch_json(AB_URL)
    arr = raw["nodes"][1]["data"]
    root = deref(arr, 0)
    data = root.get("data") or {}
    area = data.get("area") or {}
    results = data.get("results") or []
    parties = []
    seats = []
    for r in results:
        pid = str(r.get("partyId") or "").upper()
        if not pid or pid == "OTHER":
            continue
        votes = r.get("votes")
        pct = r.get("percent")
        parties.append({"code": pid, "votes": votes, "pct": pct})
        seats.append({"code": pid, "seats": None})
    def num_field(v):
        try:
            return int(v)
        except (TypeError, ValueError):
            return None
    return {
        "counted": num_field(area.get("districtsCounted")),
        "totalDistricts": num_field(area.get("districtsTotal")),
        "turnout": pct_num(area.get("turnout")),
        "votes": num_field(area.get("votesCounted")),
        "eligible": num_field(area.get("validVotes")),
        "updatedAt": (data.get("meta") or {}).get("updatedAt"),
        "parties": parties,
        "seats": seats,
    }

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--year", default="2026")
    args = ap.parse_args()
    elec = "val2022" if args.year == "2022" else "val2026"
    suffix = "S" if args.year == "2022" else "P"

    try:
        nat = fetch_json(f"{BASE}/{elec}/RD_{suffix}.json")
        out = {"source": "valmyndigheten", "election": elec, "national": normalize(nat), "valkretsar": []}
        for k in VALKRETS:
            try:
                out["valkretsar"].append(normalize(fetch_json(f"{BASE}/{elec}/RD_{k}_{suffix}.json")))
            except Exception:
                out["valkretsar"].append(None)
        print("source: valmyndigheten")
    except Exception as e:
        print(f"valmyndigheten failed ({e}); falling back to aftonbladet")
        nat = fetch_ab()
        out = {"source": "aftonbladet", "election": elec, "national": nat, "valkretsar": []}
        print("source: aftonbladet (national only)")

    # Keep the previous live.json (2022 placeholder) until districts are actually
    # counted — the LIVE tab's placeholder guard keys on that file.
    if not (out["national"] or {}).get("counted"):
        print("no districts counted yet — leaving live.json untouched")
        return

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf8") as f:
        json.dump(out, f, ensure_ascii=False)
    print("wrote", OUT, "counted", (out["national"] or {}).get("counted"))

if __name__ == "__main__":
    main()
"""Election-night live snapshot for Sweden (GitHub Actions fallback layer).

Pulls Valmyndigheten's preliminary feed (resultat.val.se/data/resultat/val2026/RD_P.json
+ per-valkrets RD_<nn>_P.json) and writes a compact data/sweden/live.json.
The LIVE tab can read this directly (static fallback) or via the Cloudflare worker.

Usage: python scraper/scrape_live_sweden.py [--year 2026]
"""
import argparse, json, os, sys, urllib.request

BASE = "https://resultat.val.se/data/resultat"
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

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--year", default="2026")
    args = ap.parse_args()
    elec = "val2022" if args.year == "2022" else "val2026"
    suffix = "S" if args.year == "2022" else "P"

    nat = fetch_json(f"{BASE}/{elec}/RD_{suffix}.json")
    out = {"source": "valmyndigheten", "election": elec, "national": normalize(nat), "valkretsar": []}
    for k in VALKRETS:
        try:
            out["valkretsar"].append(normalize(fetch_json(f"{BASE}/{elec}/RD_{k}_{suffix}.json")))
        except Exception:
            out["valkretsar"].append(None)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf8") as f:
        json.dump(out, f, ensure_ascii=False)
    print("wrote", OUT, "counted", nat.get("antalValdistriktRaknade"))

if __name__ == "__main__":
    main()
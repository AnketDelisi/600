"""Fill an exit poll into data/sweden/valu.json (SVT) or novus.json (TV4).

Usage: python scraper/update_valu.py [--novus] S=30.5 SD=19.8 M=18.4 ...
Parties without a value are left null.
"""
import argparse, json, os, sys

DIR = os.path.join(os.path.dirname(__file__), "..", "data", "sweden")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--novus", action="store_true", help="write novus.json (TV4) instead of valu.json (SVT)")
    args, rest = ap.parse_known_args()
    out = os.path.join(DIR, "novus.json" if args.novus else "valu.json")
    vals = {}
    for arg in rest:
        k, _, v = arg.partition("=")
        try:
            vals[k] = float(v)
        except ValueError:
            sys.exit(f"bad value: {arg}")
    with open(out, encoding="utf8") as f:
        data = json.load(f)
    for k, v in vals.items():
        if k in data["parties"]:
            data["parties"][k] = v
    data["published"] = None  # set to ISO timestamp manually if wanted
    with open(out, "w", encoding="utf8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("wrote", out)
    print("parties:", json.dumps({k: v for k, v in data["parties"].items() if v is not None}))

if __name__ == "__main__":
    main()
"""Fill the SVT Valu exit poll into data/sweden/valu.json.

Usage: python scraper/update_valu.py S=30.5 SD=19.8 M=18.4 V=8.1 C=5.9 KD=4.8 MP=6.2 L=5.0
Parties without a value are left null.
"""
import json, os, sys

OUT = os.path.join(os.path.dirname(__file__), "..", "data", "sweden", "valu.json")

def main():
    vals = {}
    for arg in sys.argv[1:]:
        k, _, v = arg.partition("=")
        try:
            vals[k] = float(v)
        except ValueError:
            sys.exit(f"bad value: {arg}")
    with open(OUT, encoding="utf8") as f:
        data = json.load(f)
    for k, v in vals.items():
        if k in data["parties"]:
            data["parties"][k] = v
    data["published"] = None  # set to ISO timestamp manually if wanted
    with open(OUT, "w", encoding="utf8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("wrote", OUT)
    print("parties:", json.dumps({k: v for k, v in data["parties"].items() if v is not None}))

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""Patch the france map block with the 2024 EP camp-vs-RN runoff geography.

Source: the frwiki article's "Par département" results table (RN, ENS,
PS-PP, LFI, LR, LE, REC, PCF, ... votes/% per department). Only the
camp-vs-RN axis is extracted: Ensemble (Besoin d'Europe) and RN shares,
normalized to a two-way 100 so they sit on the same scale as the 2022
runoff baselines. The app's runoffConf blends the two geographies
(runoffBlend, default 0.5) and shifts the result by the current
head-to-head average, so the RUNOFF map is half last-real-runoff, half
last-national-election geography - the 2022 runoff is the last time the
camp-vs-RN question was actually asked, the 2024 EP is the most recent
measurement of the same two blocs.

Keys mirror runoff2022: {camp, lepen}; the app remaps 'camp' onto the
pairing's camp candidate (attal/philippe) at render time.

Usage: python scraper/build_fr_ep2024.py
"""

import json
import re
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fr_departments import NAME_CODE
from build_france_map import fold

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "js" / "config.js"
API = "https://fr.wikipedia.org/w/api.php"
PAGE = "Élections européennes de 2024 en France"
UA = {"User-Agent": "600-poll-scraper/1.0"}

# national two-way anchor: the official national result (Ensemble 14.60%,
# RN 31.37% of valid votes) normalized to 100
NAT_CAMP, NAT_RN = 14.60, 31.37


def main():
    r = requests.get(API, params={
        "action": "parse", "page": PAGE, "prop": "sections",
        "format": "json", "redirects": 1}, headers=UA, timeout=60)
    r.raise_for_status()
    secs = r.json()["parse"]["sections"]
    idx = next(s["index"] for s in secs
               if s["line"].strip() == "Par département")
    r2 = requests.get(API, params={
        "action": "parse", "page": PAGE, "section": idx, "prop": "wikitext",
        "format": "json", "redirects": 1}, headers=UA, timeout=60)
    r2.raise_for_status()
    wt = r2.json()["parse"]["wikitext"]["*"]

    name_code = {fold(n): c for n, c in NAME_CODE.items()}
    assert len(name_code) == 96, len(name_code)

    rows = {}
    for row in wt.split("|-"):
        m = re.search(r'data-sort-value="([0-9AB]+)"', row)
        if not m:
            continue
        # the table covers overseas too and sorts Corse as 20A/20B;
        # the map's 96 metropolitan codes use 2A/2B
        code = m.group(1).replace("20A", "2A").replace("20B", "2B")
        if code not in set(name_code.values()):
            continue
        nm = re.search(r"\[\[([^\]|]+)(?:\|[^\]]+)?\]\]", row)
        if nm:
            key = fold(nm.group(1).split("(")[0].strip())
            if key in name_code and name_code[key] != code:
                print(f"  WARN {code}: linked name folds to "
                      f"{name_code[key]} ({nm.group(1)})")
        pcts = [float(x.replace(",", "."))
                for x in re.findall(r"\d+,\d{1,2}", row)]
        if len(pcts) < 15:
            print(f"  WARN {code}: only {len(pcts)} pct cells, skipped")
            continue
        rn, ens = pcts[0], pcts[1]
        rows[code] = (rn, ens)

    assert len(rows) == 96, f"{len(rows)} departments parsed"
    for code in name_code.values():
        assert code in rows, f"missing department {code}"

    out = {}
    for code, (rn, ens) in rows.items():
        tot = rn + ens
        assert tot > 0, code
        out[code] = {"camp": round(100 * ens / tot, 2),
                     "lepen": round(100 * rn / tot, 2)}

    nat_tot = NAT_CAMP + NAT_RN
    nat = {"camp": round(100 * NAT_CAMP / nat_tot, 2),
           "lepen": round(100 * NAT_RN / nat_tot, 2)}

    t = CONFIG.read_text(encoding="utf8")
    anchor = '      nationalRunoff: {"camp": 58.55, "lepen": 41.45},\n'
    assert anchor in t, "nationalRunoff anchor not found"
    assert "runoff2024" not in t, "runoff2024 already present"
    block = (
        "      // 2024 EP (9 Jun 2024) camp-vs-RN two-way shares per\n"
        "      // department (Ensemble/Besoin d'Europe vs RN, normalized to\n"
        "      // 100; scraper/build_fr_ep2024.py). runoffConf blends this\n"
        "      // with the 2022 runoff baselines (runoffBlend) so the RUNOFF\n"
        "      // map's geography is half last real runoff, half the most\n"
        "      // recent measurement of the same two blocs\n"
        "      runoff2024: " + json.dumps(out, ensure_ascii=False) + ",\n"
        "      nationalRunoff2024: " + json.dumps(nat) + ",\n"
        "      runoffBlend: 0.5,\n"
    )
    t = t.replace(anchor, anchor + block, 1)
    CONFIG.write_text(t, encoding="utf8")
    print(f"patched: {len(out)} departments, national {nat}")
    print("sample 75:", out["75"], "| 62:", out["62"], "| 2A:", out["2A"])


if __name__ == "__main__":
    main()

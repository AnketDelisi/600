#!/usr/bin/env python3
"""Scaffold a new country.

Creates the data/<cc>/ skeleton files and prints the config.js block (with
TODOs) plus the add-a-country checklist distilled from the last four builds
(moldova, romania, denmark, finland). Does NOT edit config.js - paste the
block yourself next to the other countries.

    python scraper/scaffold.py <cc> <Name> [--seats N] [--threshold T]
                               [--method dhondt] [--half-life 14]
                               [--map-units N]
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
METHODS = ("dhondt", "sainte_lague", "sainte_lague_standard",
           "hare_niemeyer", "imperiali_hb", "fptp")


def arg(flag, default=None):
    return sys.argv[sys.argv.index(flag) + 1] if flag in sys.argv else default


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    cc, name = sys.argv[1].lower(), sys.argv[2]
    seats = arg("--seats", "0")
    thr = arg("--threshold", "0.0")
    method = arg("--method", "dhondt")
    hl = arg("--half-life", "14")
    map_units = arg("--map-units")
    if method not in METHODS:
        sys.exit("method must be one of: " + ", ".join(METHODS))

    d = ROOT / "data" / cc
    if d.exists():
        sys.exit("data/%s already exists" % cc)
    d.mkdir(parents=True)
    (d / "polls.json").write_text(json.dumps({
        "country": cc, "source": "TODO", "source_url": "",
        "scraped_at": "", "poll_count": 0, "polls": [],
    }, indent=1) + "\n", encoding="utf8", newline="")
    (d / "meta.json").write_text(json.dumps({
        "country": cc, "name": name, "election_date": "TODO",
        "seats": int(seats), "threshold": float(thr), "method": method,
        "constituencies": False, "notes": "TODO: chamber, system, threshold, last result.",
    }, indent=1) + "\n", encoding="utf8", newline="")
    (ROOT / "img" / "flags").mkdir(parents=True, exist_ok=True)
    print("created data/%s/polls.json + meta.json\n" % cc)

    print("--- paste into js/config.js ---")
    print("""  %s: {
    name: '%s',
    seats: %s,%s
    threshold: %s,
    method: '%s',
    seatBased: false,
    constituencies: false,
    recencyHalfLifeDays: %s,
    parties: {
      aaa: { code: 'AAA', name: '...', name_en: '...', color: '#000000' }, // TODO
    },
    blocs: {  // required: the forecast sim reads bloc1/bloc2 directly
      bloc1: { name: 'Government', short: 'GOV', parties: ['aaa'], color: '#000000' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['bbb'], color: '#000000' },
    },
    lastElection: {
      date: 'YYYY-MM-DD',
      results: { aaa: 0.0 },  // must sum to ~100
      seats:   { aaa: 0 },
    },
    logos: { aaa: 'img/%s/aaa.svg' },
    parlOrder: ['aaa'],
  },""" % (cc, name, seats,
           ("            // %s map units, not chamber size" % map_units) if map_units else "",
           thr, method, hl, cc))

    print("""
--- checklist ---
 1. paste the block above into js/config.js (keep the file's country order)
 2. write scraper/scrape_%s.py - see scrape_moldova.py for the colspan-aware
    Wikipedia pattern; output data/%s/polls.json in the standard schema
 3. add the scraper to .github/workflows/update.yml (Scrape polls step)
 4. add %s to REF in scraper/audit.py
 5. flag -> img/flags/%s.svg; party logos in C:\\Users\\deneme\\Desktop\\600logo\\%s
    -> img/%s/<party>.svg (refresh LOGO_CACHE in js/config.js)
 6. python scraper/sync_party_colors.py   (pull wiki colours; check the
    article's rendered colour-swatch row, not just module name matches)
 7. map (optional): geoBoundaries ADM1 -> img/%s.svg + map block - see
    scraper/build_finland.py / build_denmark.py
 8. python scraper/release.py             (bump token, mirror site/, audit)
 9. python scraper/check_data.py --update (seed the health baseline)
10. python scraper/build_summary.py       (add to the calendar home)"""
          % (cc, cc, cc, cc, cc.upper(), cc, cc))


if __name__ == "__main__":
    main()

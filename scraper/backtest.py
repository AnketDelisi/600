#!/usr/bin/env python3
"""Phase-1 backtest: how accurate is our vote-share aggregation, by horizon?

For each (country, past cycle) the polling article of that cycle is parsed
(same Wikipedia structure as the live scrapers, with per-cycle party maps),
then the app's own aggregation is replayed as of T-30/T-14/T-7/full:
recency half-life weighting (0.5 ** days/halfLife) times the sample-size
weight (min(1500, n)), exactly like js/app.js weightedAverage. The result is
scored against the actual national result: MAE, signed bias, and whether the
largest party was called.

This is the harness the undecided-allocation and house-effect work will be
accepted or rejected against; seat-level scoring comes later (it needs the
historical maps, this does not).

Usage: python scraper/backtest.py [--country uk] [--refresh]
"""
import argparse
import json
import math
import os
import re
import statistics as st

import requests
from bs4 import BeautifulSoup

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
H = {"User-Agent": "600-poll-scraper/1.0"}

MONTHS = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
          "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12}

# per-cycle spec: polling article, election day, recency half-life (from the
# country config), party column matchers, actual national result (%)
CYCLES = {
    "uk": {
        2017: {
            "article": "Opinion_polling_for_the_2017_United_Kingdom_general_election",
            "election": "2017-06-08", "half_life": 14,
            "cols": {"con": r"^con", "lab": r"^lab", "lib": r"^lib|^ld",
                     "grn": r"^grn|^green", "snp": r"^snp",
                     "plc": r"^pc|^plaid", "ukip": r"^ukip"},
            "result": {"con": 42.4, "lab": 40.0, "lib": 7.4, "snp": 3.0,
                       "grn": 1.6, "ukip": 1.8},
        },
        2019: {
            "article": "Opinion_polling_for_the_2019_United_Kingdom_general_election",
            "election": "2019-12-12", "half_life": 14,
            "cols": {"con": r"^con", "lab": r"^lab", "lib": r"^lib|^ld",
                     "grn": r"^grn|^green", "snp": r"^snp",
                     "plc": r"^pc|^plaid", "ref": r"^brexit|^bxp"},
            "result": {"con": 43.6, "lab": 32.1, "lib": 11.5, "snp": 3.9,
                       "grn": 2.7, "ref": 2.0},
        },
        2024: {
            "article": "Opinion_polling_for_the_2024_United_Kingdom_general_election",
            "election": "2024-07-04", "half_life": 14,
            "cols": {"con": r"^con", "lab": r"^lab", "lib": r"^lib|^ld",
                     "grn": r"^grn|^green", "snp": r"^snp",
                     "plc": r"^pc|^plaid", "ref": r"^ref|^reform"},
            "result": {"lab": 33.7, "con": 23.7, "ref": 14.3, "lib": 12.2,
                       "grn": 6.8, "snp": 2.5},
        },
    },
    "spain": {
        2019: {
            "article": "Opinion_polling_for_the_November_2019_Spanish_general_election",
            "election": "2019-11-10", "half_life": 14,
            "cols": {"psoe": r"^psoe", "pp": r"^pp", "vox": r"^vox",
                     "up": r"^unidas|^up\b", "cs": r"^cs|^ciudadanos"},
            "result": {"psoe": 28.0, "pp": 20.8, "vox": 15.1, "up": 12.9,
                       "cs": 6.8},
        },
        2023: {
            "article": "Opinion_polling_for_the_2023_Spanish_general_election",
            "election": "2023-07-23", "half_life": 14,
            "cols": {"pp": r"^pp", "psoe": r"^psoe", "vox": r"^vox",
                     "sumar": r"^sumar|^unidas"},
            "result": {"pp": 33.1, "psoe": 31.7, "vox": 12.4, "sumar": 12.3},
        },
    },
    "bc": {
        2020: {
            "article": "2020_British_Columbia_general_election",
            "election": "2020-10-24", "prev": "2017-05-09", "half_life": 14,
            "cols": {"bcndp": r"^bc ndp|^ndp", "bclib": r"^bc liberal|^lib",
                     "gpbc": r"^bc green|^grn|^green"},
            "result": {"bcndp": 47.70, "bclib": 33.77, "gpbc": 15.08},
        },
        2024: {
            "article": "2024_British_Columbia_general_election",
            "election": "2024-10-19", "prev": "2020-10-25", "half_life": 14,
            "cols": {"bcndp": r"^bc ndp|^ndp",
                     "cpbc": r"^bc conserv|^con",
                     "gpbc": r"^bc green|^grn|^green"},
            "result": {"bcndp": 44.86, "cpbc": 43.28, "gpbc": 8.24},
        },
    },
    "serbia": {
        2023: {
            "article": "Opinion_polling_for_the_2023_Spanish_general_election",
            "election": "2023-07-23", "half_life": 14,
            "cols": {"pp": r"^pp", "psoe": r"^psoe", "vox": r"^vox",
                     "sumar": r"^sumar|^unidas"},
            "result": {"pp": 33.1, "psoe": 31.7, "vox": 12.4, "sumar": 12.3},
        },
    },
    "bc": {
        2020: {
            "article": "2020_British_Columbia_general_election",
            "election": "2020-10-24", "prev": "2017-05-09", "half_life": 14,
            "cols": {"bcndp": r"^bc ndp|^ndp", "bclib": r"^bc liberal|^lib",
                     "gpbc": r"^bc green|^grn|^green"},
            "result": {"bcndp": 47.70, "bclib": 33.77, "gpbc": 15.08},
        },
        2024: {
            "article": "2024_British_Columbia_general_election",
            "election": "2024-10-19", "prev": "2020-10-25", "half_life": 14,
            "cols": {"bcndp": r"^bc ndp|^ndp",
                     "cpbc": r"^bc conserv|^con",
                     "gpbc": r"^bc green|^grn|^green"},
            "result": {"bcndp": 44.86, "cpbc": 43.28, "gpbc": 8.24},
        },
    },
    "serbia": {
        2022: {
            "article": "2022_Serbian_parliamentary_election",
            "election": "2022-04-03", "prev": "2020-06-21", "half_life": 14,
            "cols": {"sns": r"^sns", "uzps": r"^uzps|^united",
                     "sps": r"^sps", "nada": r"^nada", "moramo": r"^moramo"},
            "result": {"sns": 44.27, "uzps": 14.09, "sps": 11.79,
                       "nada": 5.54, "moramo": 4.70},
        },
        2023: {
            "article": "Opinion_polling_for_the_2023_Serbian_parliamentary_election",
            "election": "2023-12-17", "prev": "2022-04-04", "half_life": 14,
            "cols": {"sns": r"^sns", "spn": r"^spn", "sps": r"^sps",
                     "nada": r"^nada", "migin": r"^mi|^gin"},
            "result": {"sns": 46.72, "spn": 23.66, "sps": 6.73,
                       "nada": 5.02, "migin": 4.70},
        },
    },
    "qc": {
        2018: {
            "article": "Opinion_polling_for_the_2018_Quebec_general_election",
            "election": "2018-10-01", "prev": "2014-04-07", "half_life": 14,
            "cols": {"caq": r"^caq", "plq": r"^plq|^qlp", "pq": r"^pq",
                     "qs": r"^qs", "pcq": r"^pcq|^conserv"},
            "result": {"caq": 37.4, "plq": 24.8, "pq": 17.1, "qs": 16.1},
        },
        2022: {
            "article": "2022_Quebec_general_election",
            "election": "2022-10-03", "prev": "2018-10-02", "half_life": 14,
            "cols": {"caq": r"^caq", "plq": r"^plq|^qlp", "pq": r"^pq",
                     "qs": r"^qs", "pcq": r"^pcq|^conserv"},
            "result": {"caq": 40.98, "plq": 14.37, "qs": 15.43, "pq": 14.61,
                       "pcq": 12.91},
        },
    },
    "nz": {
        2020: {
            "article": "Opinion_polling_for_the_2020_New_Zealand_general_election",
            "election": "2020-10-17", "exclude": r"whakaata|m[aā]ori", "prev": "2017-09-23", "half_life": 14,
            "cols": {"lab": r"^lab", "nat": r"^nat", "grn": r"^grn|^green",
                     "act": r"^act", "nzf": r"^nzf|^nz first",
                     "top": r"^top|^opportun"},
            "result": {"lab": 50.0, "nat": 25.6, "grn": 7.9, "act": 7.6,
                       "nzf": 2.6, "top": 1.5},
        },
        2023: {
            "article": "Opinion_polling_for_the_2023_New_Zealand_general_election",
            "election": "2023-10-14", "exclude": r"whakaata|m[aā]ori", "prev": "2020-10-18", "half_life": 14,
            "cols": {"lab": r"^lab", "nat": r"^nat", "grn": r"^grn|^green",
                     "act": r"^act", "nzf": r"^nzf|^nz first",
                     "tpm": r"^tpm|^m[aā]ori", "top": r"^top|^opportun"},
            "result": {"nat": 38.08, "lab": 26.92, "grn": 11.61, "act": 8.64,
                       "nzf": 6.09, "tpm": 3.08, "top": 2.22},
        },
    },
    "germany": {
        2021: {
            "article": "Opinion_polling_for_the_2021_German_federal_election",
            "election": "2021-09-26", "half_life": 14,
            "cols": {"cdu": r"^cdu|^union", "spd": r"^spd", "gruene": r"^gr[üu]ne|^green",
                     "fdp": r"^fdp", "afd": r"^afd", "linke": r"^linke"},
            "result": {"spd": 25.7, "cdu": 24.1, "gruene": 14.8, "fdp": 11.5,
                       "afd": 10.3, "linke": 4.9},
        },
        2025: {
            "article": "Opinion_polling_for_the_2025_German_federal_election",
            "election": "2025-02-23", "half_life": 14,
            "cols": {"cdu": r"^cdu|^union", "afd": r"^afd", "spd": r"^spd",
                     "gruene": r"^gr[üu]ne|^green", "linke": r"^linke",
                     "bsw": r"^bsw"},
            "result": {"cdu": 28.5, "afd": 20.8, "spd": 16.4, "gruene": 11.6,
                       "linke": 8.8, "bsw": 4.97},
        },
    },
}


def fetch(article, refresh=False):
    path = os.path.join(CACHE, "bt_%s.html" % re.sub(r"\W+", "_", article))
    if refresh or not os.path.isfile(path):
        r = requests.get("https://en.wikipedia.org/wiki/" + article,
                         headers=H, timeout=120)
        r.raise_for_status()
        open(path, "wb").write(r.content)
    return BeautifulSoup(open(path, "rb").read().decode("utf8"), "lxml")


def expand_grid(table):
    """Rows expanded over rowspan AND colspan cells (Wikipedia polling tables
    merge both: ignoring colspan doubled the headers and shifted every party
    column, which silently produced nonsense averages)."""
    grid = []
    live = {}
    for tr in table.find_all("tr"):
        cells = tr.find_all(["td", "th"])
        out, col, i = [], 0, 0
        while i < len(cells):
            while col in live and live[col][0] > 0:
                out.append(live[col][1])
                live[col][0] -= 1
                col += 1
            c = cells[i]
            txt = " ".join(c.get_text(" ", strip=True).split())
            if not txt:
                img = c.find("img")
                if img and img.get("alt"):
                    txt = " ".join(img.get("alt").split())
            rs = int(re.sub(r"[^\d]", "", str(c.get("rowspan", 1))) or 1)
            cs = int(re.sub(r"[^\d]", "", str(c.get("colspan", 1))) or 1)
            for k in range(cs):
                out.append(txt)
                live[col + k] = [rs - 1, txt]
            col += cs
            i += 1
        grid.append(out)
    return grid


def parse_date(s, year):
    s = s or ""
    # month-first ("September 30, 2018" / "Oct 1, 2018") used by the Quebec
    # articles
    mf = re.findall(r"([A-Za-z]{3})[a-z]*\s+(\d{1,2})", s)
    m = re.findall(r"(\d{1,2})\s*(?:[–-]\s*\d{1,2}\s*)?([A-Za-z]{3})",
                   s)
    if mf and (not m or s.strip().lower().startswith(mf[0][0].lower())):
        mon, d = mf[-1]
        mon = MONTHS.get(mon.lower()[:3])
        if not mon:
            return None
        y = re.search(r"(\d{4})", s)
        y = int(y.group(1)) if y else year
        return "%04d-%02d-%02d" % (y, mon, int(d))
    if not m:
        return None
    d, mon = m[-1]
    mon = MONTHS.get(mon.lower()[:3])
    if not mon:
        return None
    y = re.search(r"(\d{4})", s)
    y = int(y.group(1)) if y else year
    try:
        return "%04d-%02d-%02d" % (y, mon, int(d))
    except ValueError:
        return None


def parse_cycle(soup, spec):
    """All polls from the article's national tables."""
    polls, seen = [], set()
    year = None
    # walk headings to track the section year (the 2024 article spans years)
    for el in soup.find_all(["h2", "h3", "h4", "table"]):
        if el.name != "table":
            txt = el.get_text(" ", strip=True)
            m = re.search(r"\b(20\d{2})\b", txt)
            if m and len(txt) < 100:
                year = int(m.group(1))
            continue
        if "wikitable" not in (el.get("class") or []):
            continue
        grid = expand_grid(el)
        if len(grid) < 4:
            continue
        # header selection: try each of the first rows alone, scored by how
        # many party columns plus a date and a poll/source column it carries
        # (QC 2022's table has a full-span "Timeline of opinion polls" group
        # row first, so merging by position poisons every column; the real
        # header is the next row). If no single row qualifies, fall back to
        # the merged first-wins header (Spanish articles keep the date in
        # row 0 and the party names in row 1).
        best = None
        for ri in range(min(3, len(grid))):
            row = [h.lower() for h in grid[ri]]
            c_r = {}
            for key, pat in spec["cols"].items():
                for ci, h in enumerate(row):
                    if re.match(pat, h):
                        c_r[key] = ci
                        break
            d_r = next((i for i, h in enumerate(row) if "date" in h), None)
            p_r = next((i for i, h in enumerate(row)
                        if "poll" in h or "source" in h), None)
            score = len(c_r) + (1 if d_r is not None else 0) \
                + (1 if p_r is not None else 0)
            if best is None or score > best[0]:
                best = (score, ri, c_r, d_r, p_r)
        if best and len(best[2]) >= 3 and best[3] is not None \
                and best[4] is not None:
            ri, cols, di, pi = best[1], best[2], best[3], best[4]
            ncol = max(len(r) for r in grid[:ri + 2])
        else:
            ri = 0
            while ri < min(3, len(grid)) and not any(
                    "date" in h.lower() or "poll" in h.lower()
                    for h in grid[ri]):
                ri += 1
            if ri >= min(3, len(grid)):
                continue
            ncol = max(len(r) for r in grid[:ri + 2])
            merged = []
            for ci in range(ncol):
                v = ""
                for r2 in range(ri + 2):
                    if r2 < len(grid) and ci < len(grid[r2]) and grid[r2][ci]:
                        if v == "" and not re.match(
                                r"^[\d.,%–—-]+$", grid[r2][ci]):
                            v = grid[r2][ci]
                merged.append(v)
            hdr = [h.lower() for h in merged]
            cols = {}
            for key, pat in spec["cols"].items():
                for ci, h in enumerate(hdr):
                    if re.match(pat, h):
                        cols[key] = ci
                        break
            if len(cols) < 3:
                continue
            di = next((i for i, h in enumerate(hdr) if "date" in h), None)
            pi = next((i for i, h in enumerate(hdr)
                       if "poll" in h or "source" in h), None)
            if di is None or pi is None:
                continue
        for row in grid[ri + 1:]:
            if len(row) <= max(list(cols.values()) + [di, pi]):
                continue
            date = parse_date(row[di], year or int(spec["election"][:4]))
            if not date or not (spec["prev"] <= date <= spec["election"]):
                continue
            pollster = re.sub(r"\[\s*\w+\s*\]", "", row[pi]).strip()
            if not pollster or len(pollster) < 3:
                continue
            if re.search(r"\b(election|result)\b", pollster, re.I):
                continue
            # per-cycle exclusions: NZ articles mix Maori-electorate
            # polls (TPM ~25%) into the national tables
            if spec.get("exclude") and re.search(spec["exclude"],
                                                 pollster, re.I):
                continue
            votes = {}
            for key, ci in cols.items():
                m = re.match(r"([\d.]+)\s*%?", row[ci].replace(",", "."))
                if m:
                    votes[key] = float(m.group(1))
            if len(votes) < 3:
                continue
            # percentages only: some rows are seat projections or vote
            # counts (Datapraxis/YouGov 2019 read 344/221 and poisoned the
            # late average to Con 72.7)
            if any(v > 100 for v in votes.values()) or \
                    not 50 <= sum(votes.values()) <= 120:
                continue
            key = (pollster.lower(), date)
            if key in seen:
                continue
            seen.add(key)
            polls.append({"pollster": pollster, "date": date,
                          "votes": votes, "n": 1000})
        break
    return polls


def average(polls, as_of, half_life):
    """The app's weightedAverage: 0.5 ** (days/halfLife) * min(1500, n)."""
    out = {}
    keys = set(k for p in polls for k in p["votes"])
    for key in keys:
        num = den = 0.0
        for p in polls:
            if key not in p["votes"]:
                continue
            days = (as_of - _ord(p["date"]))
            if days < 0:
                continue
            w = math.pow(0.5, days / half_life) * min(1500, p["n"])
            num += w * p["votes"][key]
            den += w
        out[key] = num / den if den else None
    return out


def _ord(date):
    import datetime
    d = datetime.date.fromisoformat(date)
    return (d - datetime.date(2020, 1, 1)).days


def _as_ord(date):
    import datetime
    d = datetime.date.fromisoformat(date)
    return (d - datetime.date(2020, 1, 1)).days


def score(polls, spec, horizon_days):
    import datetime
    election = datetime.date.fromisoformat(spec["election"])
    as_of = election - datetime.timedelta(days=horizon_days)
    use = [p for p in polls if _ord(p["date"]) <= _as_ord(as_of.isoformat())]
    if not use:
        return None
    avg = average(use, _as_ord(as_of.isoformat()), spec["half_life"])
    keys = [k for k in spec["result"] if avg.get(k) is not None]
    if len(keys) < 3:
        return None
    errs = [avg[k] - spec["result"][k] for k in keys]
    lead_ok = (max(avg, key=lambda k: avg.get(k) or 0) ==
               max(spec["result"], key=spec["result"].get))
    return {"n": len(use), "mae": st.mean(abs(e) for e in errs),
            "bias": st.mean(errs), "lead": lead_ok}


def house_bias_table(data, upto_cycle):
    """Per-pollster per-party bias from cycles BEFORE upto_cycle, shrunk by
    the pollster's poll count (n/(n+10)). Walk-forward only: never uses the
    cycle being scored."""
    acc = {}
    for (country, cycle), (polls, result) in data.items():
        if cycle >= upto_cycle:
            continue
        for p in polls:
            for k, v in p["votes"].items():
                if k in result:
                    a = acc.setdefault((p["pollster"].lower(), k), [0.0, 0])
                    a[0] += v - result[k]
                    a[1] += 1
    out = {}
    for (ps, k), (tot, n) in acc.items():
        out[(ps, k)] = (tot / n) * (n / (n + 10.0))
    return out


def average_corrected(polls, as_of, half_life, bias):
    """weightedAverage with per-pollster per-party bias removed."""
    out = {}
    keys = set(k for p in polls for k in p["votes"])
    for key in keys:
        num = den = 0.0
        for p in polls:
            if key not in p["votes"]:
                continue
            days = _as_ord(as_of) - _ord(p["date"])
            if days < 0:
                continue
            w = math.pow(0.5, days / half_life) * min(1500, p["n"])
            b = bias.get((p["pollster"].lower(), key), 0.0)
            num += w * (p["votes"][key] - b)
            den += w
        out[key] = num / den if den else None
    return out


def score_variant(polls, spec, horizon_days, mode, bias=None):
    import datetime
    election = datetime.date.fromisoformat(spec["election"])
    as_of = election - datetime.timedelta(days=horizon_days)
    use = [p for p in polls if _ord(p["date"]) <= _as_ord(as_of.isoformat())]
    if not use:
        return None
    if mode == "corrected" and bias:
        avg = average_corrected(use, as_of.isoformat(), spec["half_life"], bias)
    else:
        avg = average(use, _as_ord(as_of.isoformat()), spec["half_life"])
    if mode == "normalized":
        tot = sum(v for v in avg.values() if v is not None)
        if tot > 0:
            avg = {k: (v * 100.0 / tot if v is not None else None)
                   for k, v in avg.items()}
    keys = [k for k in spec["result"] if avg.get(k) is not None]
    if len(keys) < 3:
        return None
    errs = [avg[k] - spec["result"][k] for k in keys]
    return {"n": len(use), "mae": st.mean(abs(e) for e in errs),
            "bias": st.mean(errs)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--country", default=None)
    ap.add_argument("--refresh", action="store_true")
    ap.add_argument("--variants", action="store_true")
    args = ap.parse_args()
    import datetime
    rows = []
    variants = []
    data_all = {}
    for country, cycles in CYCLES.items():
        for cycle, spec in sorted(cycles.items()):
            spec["prev"] = spec.get("prev", "1900-01-01")
            data_all[(country, cycle)] = (parse_cycle(
                fetch(spec["article"], args.refresh), spec), spec["result"])
    for country, cycles in CYCLES.items():
        if args.country and country != args.country:
            continue
        for cycle, spec in sorted(cycles.items()):
            spec["prev"] = spec.get("prev", "1900-01-01")
            polls = data_all[(country, cycle)][0]
            print("== %s %d: %d polls parsed" % (country, cycle, len(polls)))
            bias = house_bias_table(data_all, cycle)
            for horizon in (60, 30, 14, 7, 0):
                s = score(polls, spec, horizon)
                if not s:
                    continue
                rows.append((country, cycle, horizon, s))
                print("   T-%-3d n=%-4d MAE %.2f  bias %+5.2f  leader %s" %
                      (horizon, s["n"], s["mae"], s["bias"],
                       "OK" if s["lead"] else "MISS"))
                if args.variants:
                    c = score_variant(polls, spec, horizon, "corrected", bias)
                    nz = score_variant(polls, spec, horizon, "normalized")
                    if c:
                        print("        house-corrected: MAE %.2f (%+.2f) | "
                              "normalized: MAE %.2f" %
                              (c["mae"], c["mae"] - s["mae"], nz["mae"]))
                        variants.append((country, cycle, horizon,
                                         s["mae"], c["mae"], nz["mae"]))
    print("\n== aggregate MAE by horizon (all cycles)")
    for horizon in (60, 30, 14, 7, 0):
        vals = [r[3]["mae"] for r in rows if r[2] == horizon]
        bias = [r[3]["bias"] for r in rows if r[2] == horizon]
        lead = [r[3]["lead"] for r in rows if r[2] == horizon]
        if vals:
            print("  T-%-3d cycles=%d  MAE %.2f  mean bias %+5.2f  leaders %d/%d" %
                  (horizon, len(vals), st.mean(vals), st.mean(bias),
                   sum(lead), len(lead)))

    if variants:
        print("\n== Phase-2 variants vs baseline (mean MAE delta)")
        for horizon in (60, 30, 14, 7, 0):
            v = [x for x in variants if x[2] == horizon]
            if not v:
                continue
            d_house = st.mean(x[4] - x[3] for x in v)
            d_norm = st.mean(x[5] - x[3] for x in v)
            print("  T-%-3d n=%d  house-corrected %+0.2f  normalized %+0.2f" %
                  (horizon, len(v), d_house, d_norm))


if __name__ == "__main__":
    main()

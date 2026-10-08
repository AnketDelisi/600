"""Audit all main country models (v3). Run: python scraper/audit.py

Reference facts verified against official sources:
- hu: the national list tier uses D'Hondt (199 seats: 106 SMD + 93 list)
- slovakia: Hagenbach-Bischoff quota + largest remainders (app key: hare_niemeyer)
- qc: the 2026 map has 127 circonscriptions (DGEQ candidatures + geojson agree)
- brazil / france / bgpres: mapOnly pages; `seats` = map units, not chamber size
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
cfg = (ROOT / "js" / "config.js").read_text(encoding="utf8")
REAL_ISSUES = []

# key: (seats, threshold, method or None=runoff/mixed, constituencies)
REF = {
    "austria": (183, 4.0, "dhondt", True),
    "bg": (240, 4.0, "hare_niemeyer", False),
    "bgpres": (1, 0.0, None, False),
    "brazil": (27, 5.0, None, False),
    "bc": (93, 0.0, "fptp", True),
    "czechia": (200, 5.0, "imperiali_hb", True),
    "dk": (179, 2.0, "sainte_lague_standard", False),
    "estonia": (101, 5.0, None, True),
    "fi": (200, 0.0, "dhondt", False),
    "france": (13, 50.0, None, False),
    "germany": (630, 5.0, "sainte_lague_standard", False),
    "greece": (300, 3.0, None, True),
    "hu": (199, 5.0, "dhondt", False),
    "israel": (120, 3.25, None, False),
    "italy": (400, 3.0, None, False),
    "latvia": (100, 5.0, "sainte_lague", False),
    "md": (101, 5.0, "dhondt", False),
    "netherlands": (150, 0.6667, "dhondt", False),
    "nz": (120, 5.0, "sainte_lague_standard", True),
    "poland": (460, 5.0, "dhondt", False),
    "pt": (230, 0.0, "dhondt", False),
    "ro": (331, 5.0, "hare_niemeyer", False),
    "qc": (127, 0.0, "fptp", True),
    "serbia": (250, 3.0, "dhondt", False),
    "slovakia": (150, 5.0, "hare_niemeyer", False),
    "spain": (350, 3.0, "dhondt", False),
    "uk": (650, 0.0, "fptp", True),
}

# mapOnly pages: `seats` counts map units; no seat allocation
MAP_UNITS = {"brazil", "france", "bgpres"}
# known-normal lastElection.seats sum != seats
SEAT_SUM_NOTES = {
    "nz": "overhang: 122 actual vs 120 base",
    "qc": "2022 chamber 125 -> 2026 map 127 (normalized)",
    "italy": "4 unmodelled seats -> auto Other wedge",
}


def block(country):
    i = cfg.index("\n  %s: {" % country)
    k = cfg.index("{", i)
    depth = 0
    e = k
    while e < len(cfg):
        if cfg[e] == "{":
            depth += 1
        elif cfg[e] == "}":
            depth -= 1
            if depth == 0:
                break
        e += 1
    return cfg[k:e + 1]


def toplevel(body, key):
    m = re.search(r"\n    " + re.escape(key) +
                  r":\s*('[^']*'|\"[^\"]*\"|[\d.]+|true|false)", body)
    if not m:
        return None
    v = m.group(1)
    if v.startswith(("'", '"')):
        return v.strip("'\"")
    if v in ("true", "false"):
        return v == "true"
    try:
        return float(v)
    except ValueError:
        return None


def find_block(body, key):
    m = re.search(r"\b" + key + r":\s*\{", body)
    if not m:
        return None
    k = body.index("{", m.start())
    depth = 0
    e = k
    while e < len(body):
        if body[e] == "{":
            depth += 1
        elif body[e] == "}":
            depth -= 1
            if depth == 0:
                break
        e += 1
    return body[k:e + 1]


print("=" * 74)
print("STRUCTURAL FACTS")
print("=" * 74)
for c, (seats, thr, method, cons) in REF.items():
    b = block(c)
    s = toplevel(b, "seats")
    t = toplevel(b, "threshold")
    m = toplevel(b, "method")
    issues = []
    if s is not None and s != seats:
        issues.append("seats %s != %s" % (s, seats))
    if t is not None and abs(float(t) - thr) > 0.01:
        issues.append("threshold %s != %s" % (t, thr))
    if method and m and m != method:
        issues.append("method %s != %s" % (m, method))
    REAL_ISSUES.extend("%s: %s" % (c, i) for i in issues)
    print("%-12s" % c, "OK" if not issues else " | ".join(issues))

print()
print("=" * 74)
print("CONFIG CONSISTENCY")
print("=" * 74)
for c in REF:
    b = block(c)
    issues = []
    le = find_block(b, "lastElection")
    if le:
        rm = re.search(r"results:\s*\{([^}]*)\}", le)
        sm = re.search(r"seats:\s*\{([^}]*)\}", le)
        if rm:
            vals = [float(x) for x in re.findall(r":\s*([\d.]+)", rm.group(1))]
            if vals and not (75 <= sum(vals) <= 102):
                issues.append("results sum %.1f" % sum(vals))
        if sm and c not in MAP_UNITS:
            vals = [int(float(x)) for x in re.findall(r":\s*([\d.]+)", sm.group(1))]
            seats = toplevel(b, "seats")
            if vals and seats and sum(vals) != seats:
                if c in SEAT_SUM_NOTES:
                    issues.append("note: seats sum %d vs %s (%s)"
                                  % (sum(vals), seats, SEAT_SUM_NOTES[c]))
                else:
                    issues.append("seats sum %d != %s" % (sum(vals), seats))
    else:
        issues.append("no lastElection")
    parties = find_block(b, "parties")
    if parties:
        entries = re.findall(r"(\w+):\s*\{([^}]*)\}", parties)
        for pid, meta in entries:
            cm = re.search(r"color:\s*['\"]([^'\"]+)['\"]", meta)
            if not cm:
                issues.append("party %s no color" % pid)
            elif not re.fullmatch(r"#[0-9A-Fa-f]{6}", cm.group(1)):
                issues.append("party %s bad color %s" % (pid, cm.group(1)))
    logos = find_block(b, "logos")
    if logos:
        for m in re.finditer(r":\s*'([^']+\.svg)'", logos):
            if not (ROOT / m.group(1)).is_file():
                issues.append("logo missing: " + m.group(1))
    po = re.search(r"parlOrder:\s*\[([^\]]*)\]", b)
    if po and le:
        po_ids = set(re.findall(r"'([^']+)'", po.group(1)))
        sm = re.search(r"seats:\s*\{([^}]*)\}", le)
        if sm:
            holders = {pid for pid, v in re.findall(r"(\w+):\s*([\d.]+)", sm.group(1))
                       if float(v) > 0}
            missing = holders - po_ids
            if missing:
                issues.append("parlOrder missing: %s" % sorted(missing))
    mp = find_block(b, "map")
    if mp:
        sm = re.search(r"svg:\s*'([^']+)'", mp)
        if sm and not (ROOT / sm.group(1)).is_file():
            issues.append("map svg missing: " + sm.group(1))
        sd = find_block(mp, "seatDistricts")
        if sd:
            vals = [float(x) for x in re.findall(r":\s*([\d.]+)", sd)]
            seats = toplevel(b, "seats")
            reserved = find_block(b, "reservedSeats")
            rsum = 0.0
            if reserved:
                rsum = sum(float(x) for x in
                           re.findall(r":\s*([\d.]+)", reserved))
            if vals and seats and abs(sum(vals) - (seats - rsum)) > 0.5:
                issues.append("seatDistricts sum %.0f != %s" % (sum(vals), seats))
    blocs = find_block(b, "blocs")
    if not blocs:
        issues.append("no blocs block")
    else:
        defined = set()
        pb = find_block(b, "parties")
        if pb:
            defined |= set(re.findall(r"(\w+):\s*\{", pb))
        if le:
            for key in ("results", "seats"):
                kb = find_block(le, key)
                if kb:
                    defined |= set(re.findall(r"(\w+):", kb))
        for bid in ("bloc1", "bloc2"):
            bb = find_block(blocs, bid)
            if not bb:
                issues.append("blocs missing " + bid)
                continue
            pm = re.search(r"parties:\s*\[([^\]]*)\]", bb)
            codes = re.findall(r"['\"]([^'\"]+)['\"]", pm.group(1)) if pm else []
            if not codes:
                issues.append("%s.parties empty" % bid)
            for code in codes:
                if code not in defined:
                    issues.append("%s party %s not defined" % (bid, code))
    for f in ("polls.json", "meta.json"):
        if not (ROOT / "data" / c / f).is_file():
            issues.append("missing data/%s/%s" % (c, f))
    REAL_ISSUES.extend("%s: %s" % (c, i) for i in issues if "note:" not in i)
    print("%-12s" % c, "OK" if not issues else " | ".join(issues))

print()
if REAL_ISSUES:
    print("RESULT: %d issue(s)" % len(REAL_ISSUES))
    for i in REAL_ISSUES:
        print("  " + i)
    sys.exit(1)
print("RESULT: clean")

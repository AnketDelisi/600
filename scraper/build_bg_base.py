#!/usr/bin/env python3
"""Rebuild the Bulgaria base from the official CEC opendata + add the
October 2024 previous-election blend.

Source: the Central Election Commission's machine-readable exports
(results.cik.bg/<tag>/opendata/export.zip, "Актуализирана база данни"):
cik_parties.txt (party number -> name) and votes.txt (per-section valid
votes per party). Aggregated to the 31 MIRs (the section code's first two
digits), merged to the model's 28 provinces (Sofia-city 23/24/25 ->
sofiacity, Plovdiv-city/province -> plovdiv, unweighted means like the
original 2021-pattern build), shares over the sum of all party-list votes.

Two elections:
  pe202604 (19 Apr 2026) -> the base gebiete: the REAL per-province
    shares replace the 2021-pattern proxies (pb / MECH / Velichie were
    flat, the others scaled). PP-DB ran as one list (ppdb); the split
    pp/db projection bases are the coalition's real geography divided by
    the current national ratio (pp 5.5 / db 6.9), and the gebiete keeps
    ppdb at 0 so the result view's resultMerge fold reconstructs the
    coalition without double counting.
  pe202410 (27 Oct 2024) -> prevGebiete + prevNational + baseBlend 0.75:
    the projection blends the last two elections' geography; parties
    absent in 2024 (pb) hold their 2026 baseline.

Idempotent: rerunning replaces the gebiete / national2021 anchor values
and the prev block. Usage: python scraper/build_bg_base.py [--force]
"""

import json
import os
import re
import sys
import zipfile

import requests

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
CONFIG = os.path.join(ROOT, "js", "config.js")
H = {"User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0 Safari/537.36")}

# party name substring (normalized, upper, letters only) -> config code;
# order matters: the APS alliance first (its name shares no token with
# DPS but check before the generic DPS rule anyway)
PARTY_RULES = [
    ("АЛИАНСЗАПРАВАИСВОБОДИ", "aps"),
    ("ПРОГРЕСИВНАБЪЛГАРИЯ", "pb"),
    ("ГЕРБ", "gerb"),
    ("ПРОДЪЛЖАВАМЕПРОМЯНАТА", "ppdb"),
    ("ДПС", "dps"),
    ("ДВИЖЕНИЕЗАПРАВАИСВОБОДИ", "dps"),
    ("ВЪЗРАЖДАНЕ", "vaz"),
    ("МЕЧ", "mech"),
    ("ВЕЛИЧИЕ", "veli"),
    ("БСП", "bsp"),
]

# MIR code -> province key (standard CEC numbering, validated against the
# sections file's region names at runtime)
MIR = {
    "01": "blagoevgrad", "02": "burgas", "03": "varna",
    "04": "veliko_tarnovo", "05": "vidin", "06": "vratsa",
    "07": "gabrovo", "08": "dobrich", "09": "kardzhali",
    "10": "kyustendil", "11": "lovech", "12": "montana",
    "13": "pazardzhik", "14": "pernik", "15": "pleven",
    "16": "plovdiv", "17": "plovdiv", "18": "razgrad", "19": "ruse",
    "20": "silistra", "21": "sliven", "22": "smolyan",
    "23": "sofiacity", "24": "sofiacity", "25": "sofiacity",
    "26": "sofia", "27": "stara_zagora", "28": "targovishte",
    "29": "haskovo", "30": "shumen", "31": "yambol",
}
MIR_NAME = {
    "01": "БЛАГОЕВГРАД", "02": "БУРГАС", "03": "ВАРНА",
    "04": "ВЕЛИКО ТЪРНОВО", "05": "ВИДИН", "06": "ВРАЦА",
    "07": "ГАБРОВО", "08": "ДОБРИЧ", "09": "КЪРДЖАЛИ",
    "10": "КЮСТЕНДИЛ", "11": "ЛОВЕЧ", "12": "МОНТАНА",
    "13": "ПАЗАРДЖИК", "14": "ПЕРНИК", "15": "ПЛЕВЕН",
    "16": "ПЛОВДИВ", "17": "ПЛОВДИВ", "18": "РАЗГРАД", "19": "РУСЕ",
    "20": "СИЛИСТРА", "21": "СЛИВЕН", "22": "СМОЛЯН",
    "23": "СОФИЯ", "24": "СОФИЯ", "25": "СОФИЯ", "26": "СОФИЯ",
    "27": "СТАРА ЗАГОРА", "28": "ТЪРГОВИЩЕ", "29": "ХАСКОВО",
    "30": "ШУМЕН", "31": "ЯМБОЛ",
}

# PP-DB ran as one list in both elections (ppdb); the two parties now poll
# separately, so their projection bases are the coalition's real per-province
# geography split by the current national ratio (pp 5.5 / db 6.9, the same
# values as the swing anchor). The result view reconstructs ppdb by the
# resultMerge fold, so the gebiete itself keeps ppdb at 0 (no double count).
SPLIT = {"pp": 5.5, "db": 6.9}


def fetch_zip(tag, force=False):
    path = os.path.join(CACHE, "bg_%s_export.zip" % tag)
    if force or not os.path.isfile(path):
        r = requests.get("https://results.cik.bg/%s/opendata/export.zip"
                         % tag, headers=H, timeout=900)
        r.raise_for_status()
        open(path, "wb").write(r.content)
    return zipfile.ZipFile(path)


def db_file(z, prefix):
    for n in z.namelist():
        if n.startswith("Актуализирана") and prefix in n:
            return n
    raise SystemExit("db file %s not found" % prefix)


def norm(s):
    return re.sub(r"[^А-Яа-яA-Za-z]", "", s or "").upper()


def party_code(name):
    n = norm(name)
    for pat, code in PARTY_RULES:
        if pat in n:
            return code
    return None


def parse(tag):
    """-> ({province: {code: share}}, {code: national share})"""
    z = fetch_zip(tag)
    parties = {}
    for line in z.read(db_file(z, "cik_parties")).decode(
            "utf-8", errors="replace").split("\n"):
        if ";" in line:
            num, name = line.split(";", 1)
            parties[num.strip()] = name.strip()
    pmap = {num: party_code(name) for num, name in parties.items()}
    print(tag, "mapped:", {n: c for n, c in pmap.items() if c})

    # MIR validation from the sections file's region names
    mir_names = {}
    for line in z.read(db_file(z, "sections")).decode(
            "utf-8", errors="replace").split("\n"):
        parts = line.split(";")
        if len(parts) < 4:
            continue
        mir = parts[0][:2]
        if mir in MIR:
            nm = re.sub(r"^\d+\.\s*", "", parts[2]).strip()
            mir_names.setdefault(mir, nm)
    bad = [(m, mir_names.get(m)) for m in MIR
           if norm(MIR_NAME[m]) not in norm(mir_names.get(m, ""))]
    assert not bad, "MIR name mismatch: %r" % bad

    votes = {}      # mir -> code -> votes (home MIRs only)
    totals = {}     # mir -> all party-list valid votes (home MIRs only)
    nat_votes = {}  # code -> votes (every section, incl. abroad MIR 32)
    nat_tot = 0
    for line in z.read(db_file(z, "votes")).decode(
            "utf-8", errors="replace").split("\n"):
        parts = line.split(";")
        if len(parts) < 8:
            continue
        mir = parts[1][:2]
        home = mir in MIR
        acc = votes.setdefault(mir, {}) if home else None
        tot = totals.get(mir, 0) if home else 0
        for i in range(3, len(parts) - 2, 4):
            num = parts[i].strip()
            try:
                v = int(parts[i + 1])
            except (ValueError, IndexError):
                continue
            nat_tot += v
            code = pmap.get(num)
            if code:
                nat_votes[code] = nat_votes.get(code, 0) + v
                if home:
                    acc[code] = acc.get(code, 0) + v
            if home:
                tot += v
        if home:
            totals[mir] = tot

    prov_votes, prov_tot = {}, {}
    for mir, acc in votes.items():
        key = MIR[mir]
        pv = prov_votes.setdefault(key, {})
        for c, v in acc.items():
            pv[c] = pv.get(c, 0) + v
        prov_tot[key] = prov_tot.get(key, 0) + totals[mir]
    shares = {key: {c: round(v * 100 / prov_tot[key], 2)
                    for c, v in pv.items()}
              for key, pv in prov_votes.items()}
    nat = {c: round(v * 100 / nat_tot, 2) for c, v in nat_votes.items()}
    return shares, nat


def main():
    force = "--force" in sys.argv
    os.makedirs(CACHE, exist_ok=True)
    s26, n26 = parse("pe202604")
    s24, n24 = parse("pe202410")
    assert len(s26) == 28, len(s26)
    assert len(s24) == 28, len(s24)
    print("2026 national:", n26)
    print("2024 national:", n24)
    print("2026 blagoevgrad:", s26["blagoevgrad"])
    print("2026 kardzhali:", s26["kardzhali"])
    print("2024 kardzhali:", s24["kardzhali"])
    pb = sorted(round(v.get("pb", 0), 1) for v in s26.values())
    print("2026 pb range:", pb[0], "-", pb[-1], "(was flat 43.9)")

    text = open(CONFIG, encoding="utf8").read()
    i = text.find("\n  bg: {")
    assert i >= 0, "bg block not found"
    depth, j = 0, i
    while j < len(text):
        if text[j] == "{":
            depth += 1
        elif text[j] == "}":
            depth -= 1
            if depth == 0:
                break
        j += 1
    seg = text[i:j]

    cur = json.loads(re.search(r"gebiete:\s*(\{.*?\}),\n\s*national2021",
                               seg, re.S).group(1))
    assert set(cur) == set(s26), "province keys changed"

    gebiete = {}
    for key in sorted(s26):
        row = dict(s26[key])
        pd = row.get("ppdb", 0.0)
        tot = sum(SPLIT.values())
        for p, w in SPLIT.items():
            row[p] = round(pd * w / tot, 2)
        row["ppdb"] = 0.0
        gebiete[key] = row

    anchor = json.loads(re.search(r"national2021:\s*(\{[^}]*\})",
                                  seg).group(1))
    anchor.setdefault("ppdb", 12.4)

    jd = json.dumps
    seg = re.sub(r"gebiete:\s*\{.*?\},\n(\s*)national2021",
                 "gebiete: " + jd(gebiete, ensure_ascii=False)
                 + ",\n\\1national2021", seg, count=1, flags=re.S)
    seg = re.sub(r"national2021:\s*\{[^}]*\}",
                 "national2021: " + jd(anchor, ensure_ascii=False),
                 seg, count=1)
    seg = re.sub(r"\n      prevGebiete: .*?,\n      prevNational: .*?,\n"
                 r"      baseBlend: [\d.]+,", "", seg, flags=re.S)
    anchor_m = re.search(r"\n      national2021: \{[^}]*\},", seg)
    assert anchor_m, "anchor not found after rewrite"
    block = (
        "\n      // previous-election base (27 Oct 2024, official CEC\n"
        "      // opendata; scraper/build_bg_base.py): the projection blends\n"
        "      // 0.75 * 2026 + 0.25 * 2024 geography, result views stay\n"
        "      // pure 2026. Parties absent in 2024 (pb) and the split PP/DB\n"
        "      // (one list in both elections) hold their 2026 baseline.\n"
        "      prevGebiete: " + jd(s24, ensure_ascii=False) + ",\n"
        "      prevNational: " + jd(n24, ensure_ascii=False) + ",\n"
        "      baseBlend: 0.75,"
    )
    seg = seg[:anchor_m.end()] + block + seg[anchor_m.end():]
    text = text[:i] + seg + text[j:]
    open(CONFIG, "w", encoding="utf8", newline="").write(text)
    print("patched config.js (bg: real 2026 gebiete + 2024 prev + blend)")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Build the Dutch municipality (gemeenten) map layer.

Results: Kiesraad Tweede Kamerverkiezing 29-10-2025, official CSV
(data.overheid.nl, CC-0): votes per list per gemeente; shares are % of
the valid votes (AantalGeldigeStemmen). The 15 parties with logos are
kept, the other lists form the residual. Geometry: PDOK CBS
gebiedsindelingen 2025 WFS (gemeente_gegeneraliseerd, official GM
codes; matched via statcode).

Writes img/netherlands_gemeenten.svg and patches the netherlands block
in js/config.js with a map2 layer.

Usage: python scraper/build_netherlands_gemeenten.py [--force]
"""
import csv
import io
import json
import os
import re
import subprocess
import sys
import unicodedata
import urllib.request
import zipfile

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
ZIP = os.path.join(ROOT, "scraper", ".cache", "nl_tk2025_csv.zip")
ZIP_URL = ("https://data.overheid.nl/sites/default/files/dataset/"
           "a16f3352-c9ce-4831-a314-f989d442a258/resources/"
           "Verkiezingsuitslag%20Tweede%20Kamer%202025%20%28CSV%20"
           "Formaat%29.zip")
WFS = ("https://service.pdok.nl/cbs/gebiedsindelingen/2025/wfs/v1_0"
       "?request=GetFeature&service=WFS&version=2.0.0&typeName="
       "gebiedsindelingen:gemeente_gegeneraliseerd&outputFormat=geojson")
GEO = os.path.join(ROOT, "scraper", ".cache", "nl_gemeenten.geojson")
OUT_SVG = os.path.join(ROOT, "img", "netherlands_gemeenten.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "netherlands_gemeenten.svg")
COMBINED = os.path.join(ROOT, "scraper", ".cache", "nl_gemeenten_match.geojson")
ATTRIBUTION = ("Uitslag: Kiesraad (TK2025, CC-0); Geometrie: PDOK/CBS "
               "gebiedsindelingen 2025")

LIST2KEY = {
    "50PLUS": "fiftyplus", "BBB": "bbb", "CDA": "cda",
    "ChristenUnie": "cu", "D66": "d66", "DENK": "denk",
    "Forum voor Democratie": "fvd",
    "GROENLINKS / Partij van de Arbeid (PvdA)": "pro",
    "JA21": "ja21", "Partij voor de Dieren": "pvdd",
    "PVV (Partij voor de Vrijheid)": "pvv",
    "SP (Socialistische Partij)": "sp",
    "Staatkundig Gereformeerde Partij (SGP)": "sgp",
    "VVD": "vvd", "Volt": "volt",
}


def norm(name):
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")


def fetch_zip():
    if os.path.isfile(ZIP):
        return
    try:
        req = urllib.request.Request(ZIP_URL,
                                     headers={"User-Agent": "Mozilla/5.0"})
        data = urllib.request.urlopen(req, timeout=300).read()
    except Exception as e:
        print("urllib download failed (%s), falling back to PowerShell" % e)
        subprocess.run(["powershell", "-Command",
                        "Invoke-WebRequest -Uri '%s' -OutFile '%s' "
                        "-UserAgent 'Mozilla/5.0'" % (ZIP_URL, ZIP)],
                       check=True)
        return
    with open(ZIP, "wb") as fh:
        fh.write(data)


def main():
    force = "--force" in sys.argv
    fetch_zip()
    z = zipfile.ZipFile(ZIP)
    txt = z.read("TK2025_uitslag.csv").decode("utf-8-sig")
    rows = list(csv.reader(io.StringIO(txt), delimiter=";"))[1:]

    gems, valid = {}, {}
    prov_names = {}
    for r in rows:
        if r[1].startswith("P") and r[0]:
            prov_names[r[1][1:]] = r[0]
        if not r[1].startswith("G"):
            continue
        code = r[1][1:]
        if r[14] == "AantalGeldigeStemmen":
            valid[code] = int(r[15])
        elif r[14] == "LijstAantalStemmen" and r[6] in LIST2KEY:
            gems.setdefault(code, {"_name": r[0], "_prov": r[3][1:],
                                   "_kk": r[2][1:]})
            gems[code][LIST2KEY[r[6]]] = int(r[15])
    print("gemeenten with results:", len(gems))

    gebiete, names = {}, {}
    for code, acc in gems.items():
        v = valid[code]
        key = norm(acc["_name"])
        gebiete[key] = {p: round(acc.get(p, 0) * 100 / v, 2)
                        for p in LIST2KEY.values()}
        names[key] = acc["_name"]
    print("units with shares:", len(gebiete))

    if force or not os.path.isfile(GEO):
        req = urllib.request.Request(WFS, headers={"User-Agent": "600/1.0"})
        data = urllib.request.urlopen(req, timeout=600).read()
        with open(GEO, "wb") as fh:
            fh.write(data)
        print("downloaded PDOK geojson:", len(data), "bytes")
    gj = json.load(open(GEO, encoding="utf8"))
    print("PDOK features:", len(gj["features"]))

    by_code = {f["properties"]["statcode"][2:]: f for f in gj["features"]}
    features, matched = [], set()
    for code, acc in gems.items():
        f = by_code.get(code)
        if not f:
            print("  no geometry for", code, acc["_name"])
            continue
        key = norm(acc["_name"])
        matched.add(key)
        features.append({"type": "Feature", "properties": {"gemeente": key},
                         "geometry": f["geometry"]})
    print("features:", len(features), "| results without geometry:",
          sorted(set(gebiete) - matched))
    for key in sorted(set(gebiete) - matched):
        del gebiete[key]
        del names[key]
    with open(COMBINED, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": features}, fh)
    sys.argv = ["build_map_svg.py", "--geojson", COMBINED,
                "--name-field", "gemeente", "--attr", "id", "--no-prefix",
                "--out", OUT_SVG, "--attribution", ATTRIBUTION, "--force"]
    bm.main()
    import shutil
    shutil.copy2(OUT_SVG, BMV_SVG)

    # verify: vote-weighted gemeente shares per province vs layer 1
    cfg = json.loads(subprocess.run(
        ["node", "-e",
         "const fs=require('fs'),vm=require('vm');"
         "const c=vm.runInNewContext(fs.readFileSync('js/config.js','utf8')"
         "+';COUNTRIES');console.log(JSON.stringify(c.netherlands.map))"],
        capture_output=True, text=True, cwd=ROOT).stdout)
    provs = {}
    for code, acc in gems.items():
        p = provs.setdefault(acc["_prov"], {"_v": 0})
        p["_v"] += valid[code]
        for k in LIST2KEY.values():
            p[k] = p.get(k, 0) + acc.get(k, 0)
    print("province check (official gemeenten -> layer-1):")
    EN = {"noord_holland": "north_holland", "zuid_holland": "south_holland",
          "noord_brabant": "north_brabant", "fryslan": "friesland"}
    for pc, acc in sorted(provs.items()):
        pv = acc["_v"]
        pk = EN.get(norm(prov_names[pc]), norm(prov_names[pc]))
        worst = max(LIST2KEY.values(), key=lambda k: abs(
            acc[k] * 100 / pv - cfg["gebiete"][pk].get(k, 0)))
        diff = acc[worst] * 100 / pv - cfg["gebiete"][pk].get(worst, 0)
        print(f"  {prov_names[pc]:15s} worst {worst:9s} {diff:+.2f}pp")
    land_gebiete = {}
    for pc, acc in provs.items():
        pk = EN.get(norm(prov_names[pc]), norm(prov_names[pc]))
        pv = acc["_v"]
        land_gebiete[pk] = {k: round(acc[k] * 100 / pv, 2)
                            for k in LIST2KEY.values()}

    cfg_path = os.path.join(ROOT, "js", "config.js")
    text = open(cfg_path, encoding="utf8").read()
    start = text.index("\n  netherlands: {")
    m = re.search(r"\n  \w+: \{", text[start + 1:])
    end = start + 1 + m.start()
    block = text[start:end]
    gm = re.search(r"\n(\s+)gebiete: \{", block)
    indent = gm.group(1)
    depth, k = 0, gm.end() - 1
    while k < len(block):
        if block[k] == "{":
            depth += 1
        elif block[k] == "}":
            depth -= 1
            if depth == 0:
                break
        k += 1
    new_body = json.dumps(land_gebiete, ensure_ascii=False,
                          indent=len(indent))
    block = (block[:gm.start()] + "\n" + indent + "gebiete: " +
             new_body + block[k + 1:])
    map2 = {"svg": "img/netherlands_gemeenten.svg", "selector": "id",
            "districts": {k: k for k in gebiete},
            "gebiete": gebiete, "names": names,
            "label": "gemeenten (%d)" % len(gebiete)}
    mm = re.search(r"\n\s+map: \{", block)
    depth, k = 0, mm.end() - 1
    while k < len(block):
        if block[k] == "{":
            depth += 1
        elif block[k] == "}":
            depth -= 1
            if depth == 0:
                break
        k += 1
    m2 = re.search(r"\n\s+map2: \{", block)
    if m2:
        depth, k2 = 0, m2.end() - 1
        while k2 < len(block):
            if block[k2] == "{":
                depth += 1
            elif block[k2] == "}":
                depth -= 1
                if depth == 0:
                    break
            k2 += 1
        block = block[:m2.start()] + "\n      map2: " + \
            json.dumps(map2, ensure_ascii=False, indent=6) + block[k2 + 1:]
    else:
        block = block[:k + 1] + ",\n      map2: " + \
            json.dumps(map2, ensure_ascii=False, indent=6) + block[k + 1:]
    open(cfg_path, "w", encoding="utf8").write(text[:start] + block + text[end:])
    print("patched config.js (netherlands map2)")


if __name__ == "__main__":
    main()

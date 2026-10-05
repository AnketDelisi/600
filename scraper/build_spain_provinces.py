#!/usr/bin/env python3
"""Build the Spain (Congress of Deputies) map layer and config block.

Results: official-sourced 2023 general election per-province file
(electionresources.org/es/data/2023.csv: Community/Province/Ticket/Votes/
Percent/Seats, from the Ministry of the Interior). 52 constituencies
(50 provinces + Ceuta + Melilla), each allocating its own seats by
D'Hondt with a 3% threshold in the constituency. Geometry: geoBoundaries
ESP ADM2 (52 provinces). Party logos: img/es/ (prepared separately).

Writes img/spain.svg and inserts the spain block into js/config.js.

Usage: python scraper/build_spain_provinces.py [--force]
"""
import csv
import io
import json
import os
import re
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
CSV_PATH = os.path.join(ROOT, "scraper", ".cache", "es_2023.csv")
CSV_URL = "http://www.electionresources.org/es/data/2023.csv"
OUT_SVG = os.path.join(ROOT, "img", "spain.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "spain.svg")
COMBINED = os.path.join(ROOT, "scraper", ".cache", "es_provinces.geojson")
ATTRIBUTION = ("Resultados: Ministerio del Interior (generales 2023, via "
               "electionresources.org); Geometria: geoBoundaries.org "
               "(Canarias acercadas al continente)")

PARTIES = ["pp", "psoe", "vox", "sumar", "erc", "junts", "bildu", "pnv",
           "bng", "cc", "upn", "aa", "podemos", "salf", "ac"]
# regional parties contest only their own community: their projected share is
# pinned to zero elsewhere, so a national poll number doesn't spread them into
# provinces where they are not on the ballot. The 2023 baselines agree - ERC
# and Junts are nonzero only in Catalonia, Bildu in the Basque Country and
# Navarra, PNV in the Basque Country, BNG in Galicia, CC in the Canaries, UPN
# in Navarra; AA runs only in Andalusia, AC only in Catalonia.
PARTY_REGIONS = {
    "erc": ["cataluna"], "junts": ["cataluna"], "ac": ["cataluna"],
    "bildu": ["pais_vasco", "navarra"], "pnv": ["pais_vasco"],
    "upn": ["navarra"], "bng": ["galicia"], "cc": ["canarias"],
    "aa": ["andalucia"],
}
# province code -> (key, geoBoundaries shapeName, display name)
PROV = {
    "01": ("alava", "Alava", "Álava"),
    "02": ("albacete", "Albacete", "Albacete"),
    "03": ("alicante", "Alicante", "Alicante"),
    "04": ("almeria", "Almeria", "Almería"),
    "05": ("avila", "Avila", "Ávila"),
    "06": ("badajoz", "Badajoz", "Badajoz"),
    "07": ("balears", "Balears, Illes", "Illes Balears"),
    "08": ("barcelona", "Barcelona", "Barcelona"),
    "09": ("burgos", "Burgos", "Burgos"),
    "10": ("caceres", "Caceres", "Cáceres"),
    "11": ("cadiz", "Cadiz", "Cádiz"),
    "12": ("castellon", "Castellon", "Castellón"),
    "13": ("ciudad_real", "Ciudad Real", "Ciudad Real"),
    "14": ("cordoba", "Cordoba", "Córdoba"),
    "15": ("coruna", "Coruna", "A Coruña"),
    "16": ("cuenca", "Cuenca", "Cuenca"),
    "17": ("girona", "Girona", "Girona"),
    "18": ("granada", "Granada", "Granada"),
    "19": ("guadalajara", "Guadalajara", "Guadalajara"),
    "20": ("gipuzkoa", "Gipuzkoa", "Gipuzkoa"),
    "21": ("huelva", "Huelva", "Huelva"),
    "22": ("huesca", "Huesca", "Huesca"),
    "23": ("jaen", "Jaen", "Jaén"),
    "24": ("leon", "Leon", "León"),
    "25": ("lleida", "Lleida", "Lleida"),
    "26": ("rioja", "Rioja, La", "La Rioja"),
    "27": ("lugo", "Lugo", "Lugo"),
    "28": ("madrid", "Madrid", "Madrid"),
    "29": ("malaga", "Malaga", "Málaga"),
    "30": ("murcia", "Murcia", "Murcia"),
    "31": ("navarra", "Navarra", "Navarra"),
    "32": ("ourense", "Ourense", "Ourense"),
    "33": ("asturias", "Asturias", "Asturias"),
    "34": ("palencia", "Palencia", "Palencia"),
    "35": ("palmas", "Palmas, Las", "Las Palmas"),
    "36": ("pontevedra", "Pontevedra", "Pontevedra"),
    "37": ("salamanca", "Salamanca", "Salamanca"),
    "38": ("tenerife", "Santa Cruz de Tenerife", "Santa Cruz de Tenerife"),
    "39": ("cantabria", "Cantabria", "Cantabria"),
    "40": ("segovia", "Segovia", "Segovia"),
    "41": ("sevilla", "Sevilla", "Sevilla"),
    "42": ("soria", "Soria", "Soria"),
    "43": ("tarragona", "Tarragona", "Tarragona"),
    "44": ("teruel", "Teruel", "Teruel"),
    "45": ("toledo", "Toledo", "Toledo"),
    "46": ("valencia", "Valencia", "Valencia"),
    "47": ("valladolid", "Valladolid", "Valladolid"),
    "48": ("bizkaia", "Bizkaia", "Bizkaia"),
    "49": ("zamora", "Zamora", "Zamora"),
    "50": ("zaragoza", "Zaragoza", "Zaragoza"),
    "51": ("ceuta", "Ceuta", "Ceuta"),
    "52": ("melilla", "Melilla", "Melilla"),
}
SKIP = {"Censo", "Votantes", "Nulos", "V&aacute;lidos", "Blancos", "Otros"}
# Canary Islands are shifted towards the mainland (standard cartographic
# inset practice) so the map does not waste space on the Atlantic gap.
CANARY_SHIFT = {"palmas": (8.5, 6.25), "tenerife": (8.5, 6.25)}
# autonomous community codes (electionresources.org) -> region key
REGION = {
    "01": "andalucia", "02": "aragon", "03": "asturias", "04": "balears",
    "05": "canarias", "06": "cantabria", "07": "castilla_la_mancha",
    "08": "castilla_y_leon", "09": "cataluna", "10": "extremadura",
    "11": "galicia", "12": "madrid", "13": "navarra", "14": "pais_vasco",
    "15": "murcia", "16": "rioja", "17": "valenciana", "18": "ceuta",
    "19": "melilla",
}


def party_key(ticket):
    ab = ticket.rsplit("(", 1)[-1].rstrip(")").strip() if "(" in ticket \
        else ticket
    u = ab.upper()
    if "PSOE" in u:
        return "psoe"
    if "SUMAR" in u:
        return "sumar"
    if u == "PP":
        return "pp"
    if u == "VOX":
        return "vox"
    if u == "ERC":
        return "erc"
    if u in ("JUNTS", "JXCAT") or "JXCAT" in u:
        return "junts"
    if "BILDU" in u:
        return "bildu"
    if "EAJ-PNV" in u or u == "PNV":
        return "pnv"
    if u == "BNG":
        return "bng"
    if u == "CCA":
        return "cc"
    if u == "UPN":
        return "upn"
    if u == "AA" or "ADELANTE ANDALUC" in u:
        return "aa"
    if u == "AC" or "ALIAN" in u:
        return "ac"
    if "PODEMOS" in u:
        return "podemos"
    if u == "SALF":
        return "salf"
    return None


def main():
    force = "--force" in sys.argv
    if force or not os.path.isfile(CSV_PATH):
        req = urllib.request.Request(CSV_URL,
                                     headers={"User-Agent": "Mozilla/5.0"})
        data = urllib.request.urlopen(req, timeout=120).read()
        with open(CSV_PATH, "wb") as fh:
            fh.write(data)
        print("downloaded 2023 csv:", len(data), "bytes")

    txt = open(CSV_PATH, encoding="utf-8").read()
    rows = list(csv.reader(io.StringIO(txt)))

    def num(s):
        return int(s) if s and s.isdigit() else 0

    prov_votes, prov_seats = {}, {}
    nat_votes, nat_seats = {}, {}
    prov_valid, nat_valid = {}, 0
    prov_region, reg_votes, reg_valid = {}, {}, {}
    for r in rows:
        if len(r) < 7 or r[2] != "2023" or not r[3]:
            continue
        if r[1] and r[3] == "V&aacute;lidos":
            prov_valid[r[1]] = num(r[4])
            continue
        key = party_key(r[3])
        if r[1]:                      # province row
            prov_region[r[1]] = r[0]
            if not key:
                continue
            prov_votes.setdefault(r[1], {}).setdefault(key, 0)
            prov_votes[r[1]][key] += num(r[4])
            prov_seats.setdefault(r[1], {}).setdefault(key, 0)
            prov_seats[r[1]][key] += num(r[6])
        elif r[0]:                    # autonomous community row
            if r[3] == "V&aacute;lidos":
                reg_valid[r[0]] = num(r[4])
            elif key:
                reg_votes.setdefault(r[0], {}).setdefault(key, 0)
                reg_votes[r[0]][key] += num(r[4])
        else:                         # national row
            if r[3] == "V&aacute;lidos":
                nat_valid = num(r[4])
            elif key:
                nat_votes[key] = nat_votes.get(key, 0) + num(r[4])
                nat_seats[key] = nat_seats.get(key, 0) + num(r[6])
    print("provinces:", len(prov_votes), "| national seats:", nat_seats)

    gebiete, names, seat_districts = {}, {}, {}
    for code, (key, geob, disp) in PROV.items():
        votes = prov_votes.get(code, {})
        seats = prov_seats.get(code, {})
        vv = prov_valid.get(code) or sum(votes.values())
        gebiete[key] = {p: round(votes.get(p, 0) * 100 / vv, 2)
                        for p in PARTIES}
        seat_districts[key] = sum(seats.values())
        names[key] = disp
    national = {p: round(nat_votes.get(p, 0) * 100 / nat_valid, 2)
                for p in PARTIES}
    # AC and AA did not contest the 2023 general election: their baselines
    # come from the most recent regional elections - Alianca Catalana 3.77%
    # (Catalonia 2024) in the four Catalan provinces, Adelante Andalucia
    # 4.58% (Andalusia 2022) in the eight Andalusian ones. National anchors
    # are their national-equivalent shares.
    for k in ("barcelona", "girona", "lleida", "tarragona"):
        gebiete[k]["ac"] = 3.77
    for k in ("almeria", "cadiz", "cordoba", "granada",
              "huelva", "jaen", "malaga", "sevilla"):
        gebiete[k]["aa"] = 4.58
    national["ac"] = 0.58
    national["aa"] = 0.83
    # province -> autonomous community, and the official 2023 regional
    # baselines (used to blend the sub-national polls into the projection)
    region_of = {}
    for code, (key, geob, disp) in PROV.items():
        rc = prov_region.get(code)
        if rc and rc in REGION:
            region_of[key] = REGION[rc]
    # regional parties absent outside their own community: pin their projected
    # share to zero there (same noCandidate mechanism as the BC map)
    no_candidate = {}
    for key, reg in region_of.items():
        miss = [p for p, regs in PARTY_REGIONS.items() if reg not in regs]
        if miss:
            no_candidate[key] = miss
    print("provinces with a regional party absent:", len(no_candidate))
    region2023 = {}
    reg_acc, reg_val = {}, {}
    for code, (key, geob, disp) in PROV.items():
        rc = prov_region.get(code)
        rk = REGION.get(rc)
        if not rk:
            continue
        reg_val[rk] = reg_val.get(rk, 0) + (prov_valid.get(code) or 0)
        for p, v in prov_votes.get(code, {}).items():
            reg_acc.setdefault(rk, {}).setdefault(p, 0)
            reg_acc[rk][p] += v
    for rk, acc in reg_acc.items():
        vv = reg_val.get(rk) or sum(acc.values())
        region2023[rk] = {p: round(acc.get(p, 0) * 100 / vv, 2)
                          for p in PARTIES}
    # the regional-election baselines for the new regional parties, so the
    # sub-national polls blend against the right anchor
    region2023.setdefault("cataluna", {})["ac"] = 3.77
    region2023.setdefault("andalucia", {})["aa"] = 4.58
    print("regions:", len(region2023), "| regionOf:", len(region_of))
    print("seat total:", sum(seat_districts.values()))
    print("national:", national)
    for p in PARTIES:
        sv = sum(prov_votes.get(c, {}).get(p, 0) for c in PROV)
        print(f"  sum-check {p:8s} {sv:>9,} vs {nat_votes.get(p, 0):>9,}"
              f" ({sv - nat_votes.get(p, 0):+d})")

    gj = bm.load_geojson(
        "https://www.geoboundaries.org/api/current/gbOpen/ESP/ADM2/")
    features, matched = [], set()

    def shift_coords(c, dlon, dlat):
        if isinstance(c[0], (int, float)):
            return [c[0] + dlon, c[1] + dlat]
        return [shift_coords(x, dlon, dlat) for x in c]

    for f in gj["features"]:
        raw = f["properties"]["shapeName"]
        key = next((k for k, g, _d in PROV.values() if g == raw), None)
        if not key or key not in gebiete:
            print("  no mapping for", raw)
            continue
        matched.add(key)
        geom = f["geometry"]
        if key in CANARY_SHIFT:
            dlon, dlat = CANARY_SHIFT[key]
            geom = {"type": geom["type"],
                    "coordinates": shift_coords(geom["coordinates"], dlon,
                                                dlat)}
        features.append({"type": "Feature", "properties": {"prov": key},
                         "geometry": geom})
    print("features:", len(features), "| without geometry:",
          sorted(set(gebiete) - matched))
    assert len(features) == 52, "expected 52 provinces"
    with open(COMBINED, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": features}, fh)
    sys.argv = ["build_map_svg.py", "--geojson", COMBINED,
                "--name-field", "prov", "--attr", "id", "--no-prefix",
                "--out", OUT_SVG, "--attribution", ATTRIBUTION, "--force"]
    bm.main()
    import shutil
    shutil.copy2(OUT_SVG, BMV_SVG)

    cfg_path = os.path.join(ROOT, "js", "config.js")
    text = open(cfg_path, encoding="utf8").read()
    j = lambda o, ind: json.dumps(o, ensure_ascii=False, indent=ind)
    block = """  spain: {
    name: 'Spain',
    seats: 350,
    threshold: 3.0,               // 3% in each constituency
    method: 'dhondt',             // D'Hondt in each of the 52 constituencies
    seatBased: false,             // polls report vote shares (%)
    constituencies: false,
    recencyHalfLifeDays: 14,
    parties: {
      pp:     { code: 'PP',      name: 'Partido Popular',                    name_en: 'People\\'s Party',                      color: '#1D84CE' },
      psoe:   { code: 'PSOE',    name: 'Partido Socialista Obrero Español',  name_en: 'Spanish Socialist Workers\\' Party',    color: '#E30713' },
      vox:    { code: 'VOX',     name: 'Vox',                                name_en: 'Vox',                                   color: '#63BE21' },
      sumar:  { code: 'FA',      name: 'Frente Amplio',                     name_en: 'Broad Front',                           color: '#EF4B91' },
      erc:    { code: 'ERC',     name: 'Esquerra Republicana de Catalunya',  name_en: 'Republican Left of Catalonia',          color: '#FFB232' },
      junts:  { code: 'JUNTS',   name: 'Junts per Catalunya',                name_en: 'Together for Catalonia',                color: '#00B0B9' },
      bildu:  { code: 'EH BILDU',name: 'Euskal Herria Bildu',                name_en: 'Basque Country Gather',                 color: '#79BF43' },
      pnv:    { code: 'EAJ-PNV', name: 'Euzko Alderdi Jeltzalea',            name_en: 'Basque Nationalist Party',              color: '#008000' },
      bng:    { code: 'BNG',     name: 'Bloque Nacionalista Galego',         name_en: 'Galician Nationalist Bloc',             color: '#6CA5D0' },
      cc:     { code: 'CC',      name: 'Coalición Canaria',                  name_en: 'Canarian Coalition',                    color: '#FFCC00' },
      upn:    { code: 'UPN',     name: 'Unión del Pueblo Navarro',           name_en: 'Navarrese People\\'s Union',            color: '#1B4F9C' },
      aa:     { code: 'AA',      name: 'Adelante Andalucía',                 name_en: 'Forward Andalusia',                     color: '#24C87E' },
      podemos:{ code: 'PODEMOS', name: 'Podemos',                            name_en: 'Podemos',                               color: '#9269F5' },
      salf:   { code: 'SALF',    name: 'Se Acabó La Fiesta',                 name_en: 'The Party Is Over',                     color: '#785A46' },
      ac:     { code: 'AC',      name: 'Aliança Catalana',                   name_en: 'Catalan Alliance',                      color: '#064A81' },
    },
    order: ['pp', 'psoe', 'vox', 'sumar', 'erc', 'junts', 'bildu', 'pnv', 'bng', 'cc', 'upn', 'aa', 'podemos', 'salf', 'ac'],
    parlOrder: ['bildu', 'erc', 'aa', 'podemos', 'sumar', 'psoe', 'junts', 'pnv', 'bng', 'cc', 'upn', 'pp', 'ac', 'vox', 'salf'],
    // 2023 investiture majority (PSOE+Sumar and the regional allies) vs the right
    blocs: {
      bloc1: { name: 'Government bloc', short: 'GOV', parties: ['psoe', 'sumar', 'podemos', 'erc', 'junts', 'bildu', 'pnv', 'bng', 'cc', 'aa'], color: '#A6192E' },
      bloc2: { name: 'Opposition',      short: 'OPP', parties: ['pp', 'vox', 'salf', 'ac', 'upn'], color: '#1B4F9C' },
    },
    lastElection: {
      date: '2023-07-23',
      // 2023 general election official result (Congress; Sumar includes Podemos)
      results: @@national@@,
      seats: @@seats@@,
    },
    map: {
      svg: 'img/spain.svg',
      // swing method: geometric mean of log-odds proportional and uniform
      // swing (bounded, no ratio explosions on strongholds)
      swingMethod: 'geometric',
      // Podemos ran inside Sumar in 2023 (the coalition included it), so it
      // has no per-province baseline of its own: reconstruct it from Sumar's
      // shape (Poliwave proxy - the borrowed shape, confidence-weighted, then
      // scaled by the Podemos/Sumar national ratio), so its vote concentrates
      // where Sumar is strong instead of being flat across every province
      swingProxy: { podemos: 'sumar' },
      swingProxyConfidence: { podemos: 0.5 },
      selector: 'id',
      districtThreshold: true,    // 3% applies per constituency, not nationally
      districts: @@districts@@,
      // seats per constituency (2023 apportionment)
      seatDistricts: @@seatDistricts@@,
      // province -> autonomous community, and the official 2023 regional
      // baselines: the sub-national polls blend into these, they are not
      // the base point of the projection
      regionOf: @@regionOf@@,
      region2023: @@region2023@@,
      // 2023 vote share % per province (source: Ministerio del Interior)
      gebiete: @@gebiete@@,
      names: @@names@@,
      // national baseline for the swing projection (= 2023 result)
      national2021: @@national@@,
      // provinces where a regional party is not on the ballot: its projected
      // share is pinned to zero there
      noCandidate: @@noCandidate@@,
    },
    pollsterMAE: @@mae@@,
    maeKey: 'ES2023',
    logos: {
      pp: 'img/es/PP.svg', psoe: 'img/es/PSOE.svg', vox: 'img/es/VOX.svg',
      sumar: 'img/es/SUMAR.svg', erc: 'img/es/ERC.svg', junts: 'img/es/JUNTS.svg',
      bildu: 'img/es/EHBildu.svg', pnv: 'img/es/EAJPNV.svg', bng: 'img/es/BNG.svg',
      cc: 'img/es/CC.svg', upn: 'img/es/UPN.svg', aa: 'img/es/AA.svg',
      podemos: 'img/es/PODEMOS.svg', salf: 'img/es/SALF.svg', ac: 'img/es/AC.svg',
    },
  },
"""
    for ph, val in (
            ("national", j(national, 8).replace("\n", "\n      ")),
            ("seats", j(nat_seats, 8).replace("\n", "\n      ")),
            ("districts", j({k: k for k in gebiete}, 8).replace(
                "\n", "\n      ")),
            ("seatDistricts", j(seat_districts, 8).replace(
                "\n", "\n      ")),
            ("regionOf", j(region_of, 8).replace("\n", "\n      ")),
            ("region2023", j(region2023, 8).replace("\n", "\n      ")),
            ("gebiete", j(gebiete, 8).replace("\n", "\n      ")),
            ("names", j(names, 8).replace("\n", "\n      ")),
            ("noCandidate", j(no_candidate, 8).replace("\n", "\n      ")),
            ("mae", "{}")):
        block = block.replace("@@%s@@" % ph, val)

    m = re.search(r"\n  spain: \{", text)
    if m:
        depth, k = 0, m.end() - 1
        while k < len(text):
            if text[k] == "{":
                depth += 1
            elif text[k] == "}":
                depth -= 1
                if depth == 0:
                    break
            k += 1
        text = text[:m.start()] + "\n" + block.rstrip()[:-1] + text[k + 1:]
    else:
        anchor = "\n};\n\n// ===== Active country"
        idx = text.index(anchor)
        text = text[:idx] + "\n" + block.rstrip() + text[idx:]
    open(cfg_path, "w", encoding="utf8").write(text)
    print("patched config.js (spain block)")


if __name__ == "__main__":
    main()

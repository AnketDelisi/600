#!/usr/bin/env python3
"""Build the Spain Senate map layer (59 block-voting districts).

The Senate's districts are the Congress provinces EXCEPT the islands:
the Canaries elect through 7 island districts (Gran Canaria, Tenerife, La
Palma, La Gomera, El Hierro, Lanzarote, Fuerteventura) and the Balearics
through 3 (Mallorca, Menorca, Ibiza-Formentera). That structure is exactly
Eurostat's NUTS3 for Spain (59 regions, 2021), so the geometry comes from
the GISCO NUTS 10M file, shifted the same way as the province map so the
Canaries sit near the continent.

Baselines: the Congress per-province 2023 shares from the config's spain
gebiete; the island districts inherit their parent province's shares (the
island-level shares differ slightly - documented approximation). Seat
counts: 4 per peninsular province, 3 for Gran Canaria/Tenerife/Mallorca,
1 for the small islands, 2 for Ceuta/Melilla = 208.

Writes img/spain_senate.svg and inserts a `senate` block into the spain
config (used by the upper-chamber mode).

Usage: python scraper/build_spain_senate.py [--force]
"""
import json
import os
import re
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
OUT_SVG = os.path.join(ROOT, "img", "spain_senate.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "spain_senate.svg")
COMBINED = os.path.join(CACHE, "es_senate_nuts3.geojson")
NUTS_ZIP = os.path.join(CACHE, "NUTS_RG_10M_2021_4326.geojson")
NUTS_URL = ("https://gisco-services.ec.europa.eu/distribution/v2/nuts/"
            "geojson/NUTS_RG_10M_2021_4326.geojson")
ATTRIBUTION = ("Geometria: Eurostat GISCO NUTS 2021 (distritos del Senado = "
               "provincias + islas); Resultados base: Ministerio del "
               "Interior (generales 2023, via config gebiete)")

# NUTS3 code -> (senate district key, parent province key or None, seats)
NUTS = {
    "ES111": ("coruna", "coruna", 4), "ES112": ("lugo", "lugo", 4),
    "ES113": ("ourense", "ourense", 4), "ES114": ("pontevedra", "pontevedra", 4),
    "ES120": ("asturias", "asturias", 4), "ES130": ("cantabria", "cantabria", 4),
    "ES211": ("alava", "alava", 4), "ES212": ("gipuzkoa", "gipuzkoa", 4),
    "ES213": ("bizkaia", "bizkaia", 4), "ES220": ("navarra", "navarra", 4),
    "ES230": ("rioja", "rioja", 4), "ES241": ("huesca", "huesca", 4),
    "ES242": ("teruel", "teruel", 4), "ES243": ("zaragoza", "zaragoza", 4),
    "ES300": ("madrid", "madrid", 4),
    "ES411": ("avila", "avila", 4), "ES412": ("burgos", "burgos", 4),
    "ES413": ("leon", "leon", 4), "ES414": ("palencia", "palencia", 4),
    "ES415": ("salamanca", "salamanca", 4), "ES416": ("segovia", "segovia", 4),
    "ES417": ("soria", "soria", 4), "ES418": ("valladolid", "valladolid", 4),
    "ES419": ("zamora", "zamora", 4),
    "ES421": ("albacete", "albacete", 4), "ES422": ("ciudad_real", "ciudad_real", 4),
    "ES423": ("cuenca", "cuenca", 4), "ES424": ("guadalajara", "guadalajara", 4),
    "ES425": ("toledo", "toledo", 4),
    "ES431": ("badajoz", "badajoz", 4), "ES432": ("caceres", "caceres", 4),
    "ES511": ("barcelona", "barcelona", 4), "ES512": ("girona", "girona", 4),
    "ES513": ("lleida", "lleida", 4), "ES514": ("tarragona", "tarragona", 4),
    "ES521": ("alicante", "alicante", 4), "ES522": ("castellon", "castellon", 4),
    "ES523": ("valencia", "valencia", 4),
    "ES531": ("eivissa_formentera", "balears", 1),
    "ES532": ("mallorca", "balears", 3),
    "ES533": ("menorca", "balears", 1),
    "ES611": ("almeria", "almeria", 4), "ES612": ("cadiz", "cadiz", 4),
    "ES613": ("cordoba", "cordoba", 4), "ES614": ("granada", "granada", 4),
    "ES615": ("huelva", "huelva", 4), "ES616": ("jaen", "jaen", 4),
    "ES617": ("malaga", "malaga", 4), "ES618": ("sevilla", "sevilla", 4),
    "ES620": ("murcia", "murcia", 4),
    "ES630": ("ceuta", "ceuta", 2), "ES640": ("melilla", "melilla", 2),
    "ES701": ("gran_canaria", "palmas", 3),
    "ES702": ("tenerife", "tenerife", 3),
    "ES703": ("el_hierro", "tenerife", 1),
    "ES704": ("fuerteventura", "palmas", 1),
    "ES705": ("gran_canaria", "palmas", 3),
    "ES706": ("la_gomera", "tenerife", 1),
    "ES707": ("la_palma", "tenerife", 1),
    "ES708": ("lanzarote", "palmas", 1),
    "ES709": ("tenerife", "tenerife", 3),
}
ISLANDS = {"gran_canaria", "lanzarote", "fuerteventura", "tenerife",
           "la_palma", "la_gomera", "el_hierro", "mallorca", "menorca",
           "eivissa_formentera"}
CANARY_SHIFT = (8.5, 6.25)


def shift_coords(c, dlon, dlat):
    if isinstance(c[0], (int, float)):
        return [c[0] + dlon, c[1] + dlat]
    return [shift_coords(x, dlon, dlat) for x in c]


def read_spain_map():
    """The spain map block: gebiete + regionOf, from the config."""
    text = open(os.path.join(ROOT, "js", "config.js"),
                encoding="utf8").read()
    start = text.index("\n  spain: {")
    m = re.search(r"\n  \w+: \{", text[start + 1:])
    end = (start + 1 + m.start() if m
           else text.index("\n};\n\n// ===== Active country"))
    block = text[start:end]

    def grab(key):
        g = re.search(r"%s:\s*\{" % key, block)
        depth, k = 0, g.end() - 1
        while k < len(block):
            if block[k] == "{":
                depth += 1
            elif block[k] == "}":
                depth -= 1
                if depth == 0:
                    break
            k += 1
        return json.loads(block[g.end() - 1:k + 1])

    geb = grab("gebiete")
    reg = grab("regionOf")
    nat = None
    g2 = re.search(r"national2021:\s*\{", block)
    if g2:
        depth, k = 0, g2.end() - 1
        while k < len(block):
            if block[k] == "{":
                depth += 1
            elif block[k] == "}":
                depth -= 1
                if depth == 0:
                    break
            k += 1
        nat = json.loads(block[g2.end() - 1:k + 1])
    return geb, reg, nat, block


def main():
    force = "--force" in sys.argv
    os.makedirs(CACHE, exist_ok=True)
    geb, reg, nat, block = read_spain_map()
    print("province baselines:", len(geb), "| regions:", len(reg))

    if force or not os.path.isfile(NUTS_ZIP):
        print("downloading NUTS 10M (large, cached)...")
        urllib.request.urlretrieve(NUTS_URL, NUTS_ZIP)
    with open(NUTS_ZIP, encoding="utf8") as fh:
        gj = json.load(fh)
    feats = []
    for f in gj["features"]:
        p = f["properties"]
        if p.get("CNTR_CODE") != "ES" or p.get("LEV_LVL_CODE") not in (
                "3", 3) and p.get("LEVL_CODE") not in ("3", 3):
            continue
        nid = p.get("NUTS_ID")
        if nid not in NUTS:
            print("  unmapped NUTS3:", nid)
            continue
        key = NUTS[nid][0]
        geom = f["geometry"]
        if key in ISLANDS:
            dlon, dlat = CANARY_SHIFT if key in (
                "gran_canaria", "lanzarote", "fuerteventura", "tenerife",
                "la_palma", "la_gomera", "el_hierro") else (0, 0)
            if dlon:
                geom = {"type": geom["type"],
                        "coordinates": shift_coords(geom["coordinates"],
                                                    dlon, dlat)}
        feats.append({"type": "Feature", "properties": {"prov": key},
                      "geometry": geom})
    print("features:", len(feats))
    assert len(feats) == 59, "expected 59 Senate districts"
    with open(COMBINED, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": feats}, fh)
    sys.argv = ["build_map_svg.py", "--geojson", COMBINED,
                "--name-field", "prov", "--attr", "id", "--no-prefix",
                "--out", OUT_SVG, "--attribution", ATTRIBUTION, "--force"]
    bm.main()
    import shutil
    shutil.copy2(OUT_SVG, BMV_SVG)

    # senate conf: districts + inherited baselines + seat counts
    districts, gebiete, regionOf, seatDistricts = {}, {}, {}, {}
    for nid, (key, parent, n) in NUTS.items():
        districts[key] = key
        gebiete[key] = geb.get(parent, {})
        if reg.get(parent):
            regionOf[key] = reg[parent]
        if n != 4:
            seatDistricts[key] = n
    senate = {"svg": "img/spain_senate.svg", "selector": "id",
              "districts": districts, "gebiete": gebiete,
              "regionOf": regionOf, "seatDistricts": seatDistricts,
              "label": "Senate districts (59)"}
    if nat:
        senate["national2021"] = nat

    cfg_path = os.path.join(ROOT, "js", "config.js")
    text = open(cfg_path, encoding="utf8").read()
    start = text.index("\n  spain: {")
    m = re.search(r"\n  \w+: \{", text[start + 1:])
    end = (start + 1 + m.start() if m
           else text.index("\n};\n\n// ===== Active country"))
    blk = text[start:end]
    if "senate:" in blk:
        print("senate block already present")
        return
    j = json.dumps(senate, ensure_ascii=False, indent=6)
    j = j.replace("\n", "\n    ")
    anchor = "\n    upper: { label: 'Senate'"
    assert anchor in blk, "upper anchor not found"
    blk = blk.replace(
        anchor, "\n    // Senate's 59 block-voting districts: provinces + the\n"
                "    // Canary/Balearic islands (NUTS3) - built by\n"
                "    // scraper/build_spain_senate.py.\n"
                "    senate: " + j + "," + anchor)
    text = text[:start] + blk + text[end:]
    open(cfg_path, "w", encoding="utf8", newline="").write(text)
    print("patched config: spain.senate (",
          len(districts), "districts,", len(seatDistricts),
          "non-4 seat districts )")


if __name__ == "__main__":
    main()

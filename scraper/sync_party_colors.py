#!/usr/bin/env python3
"""Sync party colors in js/config.js with English Wikipedia's party colors.

Colors are extracted from Wikipedia's Module:Political party/<letter>
subpages (cached as scraper/.cache/wiki_party_colors.json by the fetch in
this script when missing). Each country model's parties are matched by
name_en / name, with country-suffixed and alias fallbacks.

Usage:
  python scraper/sync_party_colors.py            # report only
  python scraper/sync_party_colors.py --apply    # patch config.js colors
"""
import argparse
import json
import os
import re
import urllib.parse
import urllib.request

ROOT = os.path.join(os.path.dirname(__file__), "..")
CONFIG = os.path.join(ROOT, "js", "config.js")
CACHE = os.path.join(ROOT, "scraper", ".cache", "wiki_party_colors.json")

COUNTRY_NAMES = {
    "sweden": "Sweden", "israel": "Israel", "germany": "Germany",
    "mecklenburg_vorpommern": "Germany", "berlin": "Germany",
    "serbia": "Serbia", "latvia": "Latvia", "brazil": "Brazil",
    "austria": "Austria", "czechia": "Czech Republic",
    "poland": "Poland", "netherlands": "Netherlands",
    "estonia": "Estonia", "slovakia": "Slovakia", "france": "France",
    "greece": "Greece",
    "italy": "Italy",
    "pt": "Portugal",
    "hu": "Hungary",
    "md": "Moldova",
    "ro": "Romania",
    "no": "Norway",
    "lt": "Lithuania",
    "jp": "Japan",
}
ALIASES = {
    # Portugal
    "Aliança Democrática": "Democratic Alliance (Portugal, 2024)",
    "Democratic Alliance": "Democratic Alliance (Portugal, 2024)",
    "Socialist Party": "Socialist Party (Portugal)",
    "Chega": "Chega (political party)",
    "LIVRE": "Livre (Portugal)",
    "Unitary Democratic Coalition": "Unitary Democratic Coalition",
    "Left Bloc": "Left Bloc (Portugal)",
    "People–Animals–Nature": "People Animals Nature",
    "Juntos Pelo Povo": "Juntos Pelo Povo",
    # Hungary
    "Tisza Párt": "Tisza Party",
    "Tisza Party": "Tisza Party",
    "Fidesz–KDNP": "Fidesz–KDNP",
    "Our Homeland Movement": "Our Homeland Movement",
    "Democratic Coalition": "Democratic Coalition (Hungary)",
    "Hungarian Two-Tailed Dog Party": "Hungarian Two-Tailed Dog Party",
    # Sweden
    "Social Democrats": "Swedish Social Democratic Party",
    "Moderates": "Moderate Party",
    # Germany
    "Christian Democratic Union": "Christian Democratic Union of Germany",
    # Israel
    "Blue and White": "Blue and White (political party)",
    "The Reservists": "The Reservists (political party)",
    "Yashar": "Yashar (political party)",
    # Latvia
    "Greens and Farmers": "Union of Greens and Farmers",
    # Austria
    "NEOS – The New Austria": "NEOS (Austria)",
    "The Greens – The Green Alternative": "The Greens (Austria)",
    # Czechia
    "ANO": "ANO (political party)",
    "Oath": "Přísaha",
    # Poland
    "Civic Coalition": "Civic Coalition (political alliance)",
    "Confederation": "Confederation Liberty and Independence",
    "Together (Left)": "Partia Razem",
    # Netherlands
    "DENK": "Denk (political party)",
    "Volt": "Volt Netherlands",
    # Slovakia
    "Direction – Social Democracy": "Direction – Slovak Social Democracy",
    "Slovakia (OĽaNO successor)": "Slovakia (political party)",
    "Kotlebists – People's Party Our Slovakia":
        "People's Party Our Slovakia",
    # Serbia
    "Narodni pokret Srbije": "People's Movement of Serbia",
    "National Movement of Serbia": "People's Movement of Serbia",
    # Greece
    "Coalition of the Radical Left": "Syriza",
    "Spartans": "Spartans (Greek political party)",
    "Victory": "Niki (Greek political party)",
    "Voice of Reason": "Voice of Reason (political party)",
    # Italy
    "Democratic Party": "Democratic Party (Italy)",
    "League for Salvini Premier": "Lega (political party)",
    "Forza Italia": "Forza Italia (2013)",
    "Action": "Action (Italian political party)",
    # Bulgaria
    "GERB–SDS": "GERB",
    "Vazrazhdane": "Revival (Bulgarian political party)",
    "Moral, Unity, Honour": "Morality, Unity, Honour",
    "PP–DB": "We Continue the Change – Democratic Bulgaria",
    # Serbia
    "Aleksandar Vučić – United Serbia": "United Serbia (2026 coalition)",
    "Serbia Against Violence": "Serbia Against Violence (coalition)",
    # Spain
    "People's Party": "People's Party (Spain)",
    "Vox": "Vox (political party)",
    "Broad Front": "Sumar (electoral platform)",
    "Together for Catalonia": "Together for Catalonia (2020)",
    "Forward Andalusia": "Adelante Andalucía (2021)",
    "Podemos": "Podemos (Spanish political party, 2022)",
    # Greece
    "Greek Left Alliance": "Greek Left Alignment",
    # Moldova
    "Alternative Bloc": "Alternative (political bloc)",
}


def fetch_colors():
    if os.path.exists(CACHE):
        return json.load(open(CACHE, encoding="utf8"))
    letters = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    titles = "|".join("Module:Political party/" + l for l in letters)
    url = ("https://en.wikipedia.org/w/api.php?action=query&prop=revisions"
           "&rvprop=content&rvslots=main&format=json&titles=" +
           urllib.parse.quote(titles))
    req = urllib.request.Request(url,
                                 headers={"User-Agent": "600-color-sync/1.0"})
    data = json.loads(urllib.request.urlopen(req, timeout=180).read())
    colors = {}
    for page in data["query"]["pages"].values():
        if "revisions" not in page:
            continue
        content = page["revisions"][0]["slots"]["main"]["*"]
        for m in re.finditer(r'\["([^"]+)"\]\s*=\s*\{([^}]*)\}', content):
            cm = re.search(r'color\s*=\s*"(#[0-9A-Fa-f]{3,8})"', m.group(2))
            if cm:
                colors[m.group(1)] = cm.group(1).upper()
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    json.dump(colors, open(CACHE, "w", encoding="utf8"))
    return colors


def brace_block(t, start):
    depth = 0
    i = start
    while i < len(t):
        if t[i] == "{":
            depth += 1
        elif t[i] == "}":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return len(t) - 1


def parse_models(text):
    models = {}
    for m in re.finditer(r"\n  (\w+): \{", text):
        key = m.group(1)
        block_end = brace_block(text, m.end() - 1)
        block = text[m.end() - 1:block_end + 1]
        pm = re.search(r"parties:\s*\{", block)
        if not pm:
            continue
        p_end = brace_block(block, pm.end() - 1)
        pblock = block[pm.end() - 1:p_end + 1]
        entries = []
        for em in re.finditer(r"(\w+):\s*\{", pblock):
            e_end = brace_block(pblock, em.end() - 1)
            etext = pblock[em.end() - 1:e_end + 1]

            def field(f):
                fm = re.search(rf"{f}:\s*(?:'((?:[^'\\]|\\.)*)'|\"([^\"]*)\")",
                               etext)
                if not fm:
                    return None
                return (fm.group(1) or fm.group(2) or "").replace("\\'", "'")

            entries.append({
                "key": em.group(1),
                "name": field("name"),
                "name_en": field("name_en"),
                "color": field("color"),
                "abs": m.end() - 1 + pm.end() - 1 + em.end() - 1,
                "end": m.end() - 1 + pm.end() - 1 + e_end,
            })
        models[key] = entries
    return models


OVERRIDES = {
    # Wikipedia keeps a historical (black) ÖVP entry; the current party is
    # the 2017 turquoise one (#63C3D0).
    ("austria", "Austrian People's Party"): "Austrian People's Party (2017)",
    # country-specific module entries (bare names match the wrong party)
    ("serbia", "Russian Party"): "Russian Party (Serbia)",
    ("serbia", "Social Democratic Party"): "Social Democratic Party (Serbia)",
    ("germany", "Christian Democratic Union / Christian Social Union"): "CDU/CSU",
    ("czechia", "Free"): "Svobodní",
    ("czechia", "Tricolour Civic Movement"): "Tricolour (political party)",
    ("pt", "Democratic Alliance"): "Democratic Alliance (Portugal, 2024)",
    ("uk", "Labour Party"): "Labour Party (UK)",
    ("nz", "Labour Party"): "New Zealand Labour Party",
    ("ro", "Social Democratic Party"): "Social Democratic Party (Romania)",
    # Japan: the module uses the full Japanese-derived names
    ("jp", "Japan Innovation Party"): "Nippon Ishin no Kai",
    ("jp", "Komeito"): "Kōmeitō",
    ("ro", "Save Romania Union"): "Save Romania Union (2022)",
    ("ro", "Democratic Union of Hungarians in Romania"):
        "Democratic Alliance of Hungarians in Romania",
}

# Deliberate deviations from the module (kept out of --apply)
SKIP = {
    # module color is white; invisible on our UI — keep the gray
    ("bgpres", "None of the above"): "white on white; UI keeps #9CA3AF",
    ("bg", "None of the above"): "white on white; UI keeps #9CA3AF",
}


def lookup(colors, entry, country):
    for n in (entry["name_en"], entry["name"]):
        key = OVERRIDES.get((country, n))
        if key and key in colors:
            return key, colors[key]
    names = [entry["name_en"], entry["name"]]
    for n in list(names):
        if n:
            names.append(ALIASES.get(n, n))
    cands = []
    for n in names:
        if not n:
            continue
        cands.append(n)
        cname = COUNTRY_NAMES.get(country)
        if cname:
            cands.append(f"{n} ({cname})")
            cands.append(f"{n} (nationwide)")
        cands.append(re.sub(r"\s*\([^)]*\)$", "", n))
    for c in cands:
        if c in colors:
            return c, colors[c]
    return None, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    colors = fetch_colors()
    text = open(CONFIG, encoding="utf8").read()
    models = parse_models(text)
    patches = []
    stats = {"matched": 0, "missing": 0, "same": 0}
    for country, entries in models.items():
        print(f"== {country}")
        for e in entries:
            skip = SKIP.get((country, e["name_en"] or e["name"]))
            if skip:
                stats["missing"] += 1
                print(f"  -- {e['key']:16s} {e['name_en'] or e['name']} "
                      f"(current {(e['color'] or '').upper()})  SKIP: {skip}")
                continue
            wname, wcolor = lookup(colors, e, country)
            cur = (e["color"] or "").upper()
            if not wcolor:
                stats["missing"] += 1
                print(f"  ?? {e['key']:16s} {e['name_en'] or e['name']} "
                      f"(current {cur})")
                continue
            stats["matched"] += 1
            if wcolor == cur:
                stats["same"] += 1
                continue
            print(f"  -> {e['key']:16s} {e['name_en'] or e['name']:35s} "
                  f"{cur} => {wcolor}  [{wname}]")
            patches.append((e, wcolor))
    print(f"\nmatched {stats['matched']}, already equal {stats['same']}, "
          f"missing {stats['missing']}, changes {len(patches)}")

    if args.apply and patches:
        out = text
        for e, wcolor in sorted(patches, key=lambda p: -p[0]["abs"]):
            seg = out[e["abs"]:e["end"] + 1]
            new_seg = re.sub(r"color:\s*'[^']*'", f"color: '{wcolor}'", seg,
                             count=1)
            out = out[:e["abs"]] + new_seg + out[e["end"] + 1:]
        open(CONFIG, "w", encoding="utf8").write(out)
        print(f"patched {len(patches)} colors in js/config.js")


if __name__ == "__main__":
    main()

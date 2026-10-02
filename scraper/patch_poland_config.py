#!/usr/bin/env python3
"""One-time migration: rename the 7 outdated Poland okreg keys in config.js.

The site's Poland data used the English Wikipedia 2023 table names for
seven okregi (Krakow I/II, Bielsko-Biala I/II, Katowice I/II/III), which
are pre-2011 names; the current official names are Chrzanow, Krakow,
Bielsko-Biala, Gliwice, Rybnik, Katowice, Sosnowiec. Values and mandates
are unchanged (they were already the correct 2023 per-okreg data).

Usage: python scraper/patch_poland_config.py
"""
import re

PATH = "js/config.js"
RENAMES = {
    "Krakow1": "Chrzanow", "Krakow2": "Krakow",
    "BielskoBiala1": "BielskoBiala", "BielskoBiala2": "Rybnik",
    "Katowice1": "Gliwice", "Katowice2": "Katowice",
    "Katowice3": "Sosnowiec",
}
DISPLAY = {
    "Kraków I": "Chrzanów", "Kraków II": "Kraków",
    "Bielsko-Biała I": "Bielsko-Biała", "Bielsko-Biała II": "Rybnik",
    "Katowice I": "Gliwice", "Katowice II": "Katowice",
    "Katowice III": "Sosnowiec",
}


def main():
    text = open(PATH, encoding="utf8").read()
    start = text.index("\n  poland: {")
    m = re.search(r"\n  \w+: \{", text[start + 1:])
    end = start + 1 + (m.start() if m else len(text) - start - 1)
    section = text[start:end]
    counts = {}
    for old, new in RENAMES.items():
        n = len(re.findall(rf"\b{old}\b", section))
        if n:
            section = re.sub(rf"\b{old}\b", new, section)
            counts[old] = n
    for old, new in DISPLAY.items():
        n = section.count(f"'{old}'")
        if n:
            section = section.replace(f"'{old}'", f"'{new}'")
            counts[old + " (display)"] = n
    text = text[:start] + section + text[end:]
    open(PATH, "w", encoding="utf8").write(text)
    print("renamed:", counts)


if __name__ == "__main__":
    main()

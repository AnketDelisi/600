#!/usr/bin/env python3
"""Add Freie Waehler (FW) to the Germany model and wire the SSW logo.

FW's per-state and national 2025 Zweitstimme shares come from the same
official kerg2 file as the existing gebiete (scraper/.cache/
de_btw25_kerg2.csv). Adds the party entry (color #F7A800 from the wiki
module), order/parlOrder placement, the 16 per-state gebiete values, the
national anchor + lastElection rows, and copies the user-prepared logos
(600logo/DE/{FW,SSW}.svg -> img/de/). The SSW party already exists in the
model (minority exemption); it only lacked its logo.

Idempotent: skips if fw is already in the parties. Usage:
python scraper/build_de_fw.py
"""
import csv
import io
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / 'scraper' / '.cache'
CONFIG = ROOT / 'js' / 'config.js'
LOGO_SRC = Path(r'C:\Users\deneme\Desktop\600logo\DE')

LAND_KEY = {
    'Schleswig-Holstein': 'schleswig_holstein',
    'Mecklenburg-Vorpommern': 'mecklenburg_vorpommern',
    'Hamburg': 'hamburg', 'Niedersachsen': 'niedersachsen',
    'Bremen': 'bremen', 'Brandenburg': 'brandenburg',
    'Sachsen-Anhalt': 'sachsen_anhalt', 'Berlin': 'berlin',
    'Nordrhein-Westfalen': 'nordrhein_westfalen', 'Sachsen': 'sachsen',
    'Hessen': 'hessen', 'Thüringen': 'thuringen',
    'Rheinland-Pfalz': 'rheinland_pfalz', 'Bayern': 'bayern',
    'Baden-Württemberg': 'baden_wurttemberg', 'Saarland': 'saarland',
}


def fw_shares():
    txt = (CACHE / 'de_btw25_kerg2.csv').read_text(encoding='utf-8-sig')
    rows = list(csv.reader(io.StringIO(txt), delimiter=';'))
    hi = next(i for i, r in enumerate(rows) if r and r[0] == 'Wahlart')
    hdr = rows[hi]
    data = [dict(zip(hdr, r)) for r in rows[hi + 1:] if len(r) >= len(hdr)]
    land = {r['Gebietsnummer']: r['Gebietsname'] for r in data
            if r['Gebietsart'] == 'Land' and r['Gruppenart'] == 'Partei'}
    out, nat = {}, None
    for r in data:
        if r['Gruppenart'] != 'Partei' or r['Stimme'] != '2':
            continue
        if 'WÄHLER' not in r['Gruppenname'].upper():
            continue
        v = round(float(r['Prozent'].replace(',', '.')), 2)
        if r['Gebietsart'] == 'Land':
            out[LAND_KEY[land[r['Gebietsnummer']]]] = v
        elif r['Gebietsart'] == 'Bund':
            nat = v
    assert len(out) == 16 and nat, (len(out), nat)
    return out, nat


def main():
    per_state, nat = fw_shares()
    print('FW national:', nat, '| Bayern:', per_state['bayern'])

    t = CONFIG.read_text(encoding='utf8')
    i = t.find('\n  germany: {')
    depth, j = 0, i
    while j < len(t):
        if t[j] == '{':
            depth += 1
        elif t[j] == '}':
            depth -= 1
            if depth == 0:
                break
        j += 1
    seg = t[i:j]
    assert "fw:" not in seg and "'fw'" not in seg, 'fw already present'

    # 1. party entry after fdp
    fdp = re.search(r"\n      fdp:\s*\{[^\n]*\},", seg)
    assert fdp, 'fdp entry not found'
    seg = (seg[:fdp.end()]
           + "\n      fw:   { code: 'FW',   name: 'Freie Wähler', "
             "name_en: 'Free Voters', color: '#F7A800', ideology: "
             "\"Regionalism, Localism, Conservative liberalism\"},"
           + seg[fdp.end():])
    # 2. order / parlOrder
    seg = seg.replace("'fdp', 'ssw']", "'fdp', 'fw', 'ssw']", 1)
    seg = seg.replace("'cdu', 'fdp', 'afd', 'ssw']",
                      "'cdu', 'fdp', 'fw', 'afd', 'ssw']", 1)
    # 3. gebiete rows: append "fw" after the bsw entry of each state
    for key, v in per_state.items():
        pat = re.compile(r'("%s": \{.*?)(\n(\s*)"bsw": [\d.]+)(\s*\})' % key,
                         re.S)
        m = pat.search(seg)
        assert m, 'gebiete row not found: %s' % key
        indent = m.group(3)
        seg = (seg[:m.start()] + m.group(1) + m.group(2) + ','
               + '\n' + indent + '"fw": %.2f' % v + m.group(4)
               + seg[m.end():])
    # 4. national anchor
    m = re.search(r'national2021:\s*\{([^}]*)\}', seg)
    assert m, 'national2021 not found'
    seg = (seg[:m.end() - 1] + ', "fw": %.2f' % nat + seg[m.end() - 1:])
    # 5. lastElection results + seats
    m = re.search(r'results:\s*\{([^}]*)\}', seg)
    seg = (seg[:m.end() - 1] + ', fw: %.2f' % nat + seg[m.end() - 1:])
    m = re.search(r'seats:\s*\{([^}]*)\}', seg)
    seg = (seg[:m.end() - 1] + ', fw: 0' + seg[m.end() - 1:])
    # 6. logos
    lm = re.search(r"bsw: 'img/de/BSW\.svg',", seg)
    assert lm, 'logos bsw entry not found'
    seg = (seg[:lm.end()]
           + " fw: 'img/de/FW.svg', ssw: 'img/de/SSW.svg',"
           + seg[lm.end():])

    t = t[:i] + seg + t[j:]
    CONFIG.write_text(t, encoding='utf8', newline='')

    dst = ROOT / 'img' / 'de'
    dst.mkdir(parents=True, exist_ok=True)
    for name in ('FW.svg', 'SSW.svg'):
        shutil.copy2(LOGO_SRC / name, dst / name)
        print('copied img/de/' + name)
    print('patched config.js (germany: fw added, ssw logo wired)')


if __name__ == '__main__':
    main()

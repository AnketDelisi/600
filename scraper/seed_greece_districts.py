#!/usr/bin/env python3
"""Wire the Greece 59-constituency layer (idempotent)."""
import json
import os
import re

ROOT = r'C:\Users\deneme\Desktop\600'
CFG = os.path.join(ROOT, 'js', 'config.js')

d = json.load(open(os.path.join(ROOT, 'data', 'greece', 'districts.json'),
                   encoding='utf8'))
cmap = {'ND': 'nd', 'SYRIZA': 'syriza', 'PASOK': 'pasok', 'KKE': 'kke',
        'EL': 'el', 'NIKI': 'niki', 'PE': 'pe', 'MERA25': 'm25',
        'SPARTI': 'sp'}

t = open(CFG, encoding='utf8').read()
i = t.find('\n  greece: {')
m = re.search(r'\n  \w+: \{', t[i + 10:])
j = i + 10 + m.start()
seg = t[i:j]
if 'seatDistricts' in seg and 'mv2023' in seg:
    print('already wired')
    raise SystemExit(0)
if 'greece_constituencies.svg' not in seg:
    seg = seg.replace("svg: 'img/greece.svg',",
                      "svg: 'img/greece_constituencies.svg',\n"
                      "      label: 'SEÇİM ÇEVRESİ',", 1)
if 'map2:' not in seg:
    seg = seg.replace("    },\n    pollsterMAE:",
                      "    },\n    map2: { svg: 'img/greece.svg',"
                      " label: 'BÖLGE' },\n    pollsterMAE:", 1)

dis, geb, nam, sd, mv = [], [], [], [], {}
for code, e in sorted(d.items()):
    k = code.lower()
    if k == 'ovs':
        continue
    dis.append('"%s": "%s"' % (k, k))
    sh = {cmap[p]: round(v, 2) for p, v in e['pcts'].items() if p in cmap}
    geb.append('"%s": {%s}' % (k, ', '.join('"%s": %s' % (p, v)
                                            for p, v in sorted(sh.items()))))
    nam.append('"%s": "%s"' % (k, e['name']))
    seats = int(e['seats'])
    sd.append('"%s": %d' % (k, seats))
    q = {p: v for p, v in sh.items() if v > 0}
    won = {p: 0 for p in q}
    for _ in range(seats):
        best = max(q, key=lambda p: q[p] / (won[p] + 1))
        won[best] += 1
    mv[k] = {p: n for p, n in won.items() if n}

# same-line objects: insert right after the opening brace
seg = seg.replace("svg: 'img/greece.svg',",
                  "svg: 'img/greece_constituencies.svg',\n"
                  "      label: 'SEÇİM ÇEVRESİ',", 1)
seg = seg.replace("districts: {", 'districts: {%s, ' % ','.join(dis), 1)
seg = seg.replace("gebiete: {", 'gebiete: {%s, ' % ','.join(geb), 1)
seg = seg.replace("names: {", 'names: {%s, ' % ','.join(nam), 1)
seg = seg.replace("national2021",
                  "seatDistricts: {%s},\n      "
                  "mv2023: %s,\n      national2021"
                  % (', '.join(sd), json.dumps(mv, ensure_ascii=False)), 1)
seg = seg.replace("    },\n    pollsterMAE:",
                  "    },\n    map2: { svg: 'img/greece.svg',"
                  " label: 'BÖLGE' },\n    pollsterMAE:", 1)
for must in ('greece_constituencies.svg', 'seatDistricts', 'mv2023',
             'map2'):
    assert must in seg, must
open(CFG, 'w', encoding='utf8', newline='').write(t[:i] + seg + t[j:])
print('greece districts wired: 59 constituencies + seats + mv2023 + map2')

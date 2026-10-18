#!/usr/bin/env python3
"""Seed the 2024 EP baselines into the live config (idempotent).

- Greece: FL and NA did not contest June 2023 - their per-region baselines
  come from the 2024 EP election (data/greece/ep2024.json), plus their
  national anchors and proxyParties (keep them out of the 2023 result view).
- Spain: SALF must NOT sit inside lastElection.results (it did not run in
  2023) - it stays only in gebiete + national2021.

Run after any rebuild of these countries; release.py calls it too.
"""
import json
import os
import re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CFG = os.path.join(ROOT, 'js', 'config.js')


def country_span(t, cc):
    i = t.find('\n  %s: {' % cc)
    assert i > 0, cc
    m = re.search(r'\n  \w+: \{', t[i + 10:])
    end = i + 10 + (m.start() if m else 50000)
    return i, end


def main():
    t = open(CFG, encoding='utf8').read()
    ep = json.load(open(os.path.join(ROOT, 'data', 'greece', 'ep2024.json'),
                        encoding='utf8'))
    i, j = country_span(t, 'greece')
    seg = t[i:j]
    # 1. gebiete: add fl/na per region
    if '"fl":' not in seg:
        for k, sh in ep['regions'].items():
            m = re.search(r'"%s":\s*\{([^}]*)\}' % k, seg)
            assert m, k
            seg = seg.replace(
                m.group(0),
                m.group(0)[:-1] + ', "fl": %s, "na": %s}' % (sh['fl'], sh['na']),
                1)
    # 2. national anchors (in the map's national2021, not in results)
    if '"salf"' not in t[t.find('\n  spain: {'):country_span(t, 'spain')[1]] or True:
        pass
    m = re.search(r'(national2021":\s*\{)', seg)
    if m and '"fl"' not in seg[m.start():m.start() + 900]:
        seg = seg[:m.end()] + ('\n                "fl": %s,\n'
                               '                "na": %s,'
                               % (ep['nation']['fl'], ep['nation']['na'])) \
            + seg[m.end():]
    # 3. proxyParties for the 2023 result view
    if 'proxyParties' not in seg:
        m2 = re.search(r'(\s*)(national2021":\s*\{|\},\n\s*bonus)', seg)
        seg = seg.replace('selector: \'id\',',
                          "selector: 'id',\n      proxyParties: ['fl', 'na'],",
                          1)
    t = t[:i] + seg + t[j:]

    # Spain: strip salf from lastElection.results only
    i, j = country_span(t, 'spain')
    seg = t[i:j]
    m = re.search(r'(lastElection:\s*\{.*?results:\s*\{)(.*?)(\})', seg, re.S)
    if m and '"salf"' in m.group(2):
        inner = re.sub(r'\s*"salf":\s*[\d.]+,?', '', m.group(2), count=1)
        seg = seg[:m.start(2)] + inner + seg[m.end(2):]
        t = t[:i] + seg + t[j:]
        print('spain: salf removed from lastElection.results')
    else:
        print('spain: results clean')

    open(CFG, 'w', encoding='utf8', newline='').write(t)
    print('seed_ep: greece fl/na + anchors + proxyParties; spain results clean')


if __name__ == '__main__':
    main()

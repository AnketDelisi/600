import json
import os
import re

ROOT = r'C:\Users\deneme\Desktop\600'
CFG = os.path.join(ROOT, 'js', 'config.js')
ep = json.load(open(os.path.join(ROOT, 'data', 'greece', 'ep2024.json'),
                    encoding='utf8'))

t = open(CFG, encoding='utf8').read()
i = t.find('\n  greece: {')
m = re.search(r'\n  \w+: \{', t[i + 10:])
j = i + 10 + m.start()
seg = t[i:j]

# 1. gebiete: replace the 0.0 fl/na placeholders per region
n = 0
for k, sh in ep['regions'].items():
    mm = re.search(r'"%s": \{(.*?)\}' % k, seg, re.S)
    assert mm, k
    block = mm.group(1)
    b2 = re.sub(r'"fl": [\d.]+', '"fl": %s' % (sh.get('fl') or sh['FL']), block)
    b2 = re.sub(r'"na": [\d.]+', '"na": %s' % (sh.get('na') or sh['NA']), b2)
    if b2 != block:
        seg = seg[:mm.start(1)] + b2 + seg[mm.end(1):]
        n += 1
print('regions seeded:', n)

# 2. national2021 anchors
mm = re.search(r'(national2021"?\s*:\s*\{)(.*?)(\})', seg, re.S)
assert mm
nb = re.sub(r'"fl": [\d.]+',
            '"fl": %s' % (ep['nation'].get('fl') or ep['nation']['FL']),
            mm.group(2))
nb = re.sub(r'"na": [\d.]+',
            '"na": %s' % (ep['nation'].get('na') or ep['nation']['NA']), nb)
seg = seg[:mm.start(2)] + nb + seg[mm.end(2):]

# 3. proxyParties
if 'proxyParties' not in seg:
    seg = seg.replace("selector: 'id',",
                      "selector: 'id',\n      proxyParties: ['fl', 'na'],", 1)

t = t[:i] + seg + t[j:]
open(CFG, 'w', encoding='utf8', newline='').write(t)
print('seed_ep: greece fl/na replaced (placeholders), anchors, proxyParties')

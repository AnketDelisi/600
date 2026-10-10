#!/usr/bin/env python3
"""Fetch each party's ideology line from its English Wikipedia infobox.

The reference posters carry a one-line descriptor under each party name
("sosyal demokrasi, bağımsızlık"). The en.wikipedia party articles carry an
`ideology` field in their infobox; this script resolves every config party
via its name_en (search API, top hits until one has the field), extracts it,
strips footnote markers, keeps up to three items and patches the config
party entries with an `ideology` string. Articles without the field are
reported and left untouched.

    python scraper/scrape_ideologies.py [--force] [--country qc]

Cached per article in scraper/.cache, so reruns are cheap.
"""
import json
import os
import re
import sys
import time

import requests
from bs4 import BeautifulSoup

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
H = {"User-Agent": "600-poll-scraper/1.0"}
MAX_ITEMS = 3
DELAY = 0.35  # the search API rate-limits rapid bursts


STOP = {"of", "the", "and", "party", "parti", "partido", "partito",
        "in", "for", "list", "election", "elections"}


def hit_score(title, name):
    """Word overlap between a search hit and the party name - the search API
    happily returns the same wrong article first for every query (British
    Columbia queries all hit the Conservative Party article), so hits must be
    ranked, not trusted in order."""
    tw = set(re.findall(r"\w+", title.lower())) - STOP
    nw = set(re.findall(r"\w+", name.lower())) - STOP
    if not nw:
        return 0
    return len(tw & nw) / len(nw)


def search_titles(name, country_name=None):
    queries = []
    if country_name:
        queries.append("%s %s" % (name, country_name))
    queries.append(name)
    out = []
    for q in queries:
        titles = []
        for attempt in range(3):
            r = requests.get("https://en.wikipedia.org/w/api.php",
                             params={"action": "query", "list": "search",
                                     "srsearch": q, "format": "json",
                                     "srlimit": 5},
                             headers=H, timeout=60)
            time.sleep(DELAY + attempt * 1.5)
            try:
                titles = [h["title"] for h in r.json()["query"]["search"]]
            except Exception:
                titles = []
            if titles:
                break
        out += titles
    seen, uniq = set(), []
    for t in out:
        if t not in seen:
            seen.add(t)
            uniq.append(t)
    uniq.sort(key=lambda t: hit_score(t, name), reverse=True)
    return uniq


def fetch(title, force=False):
    path = os.path.join(CACHE, "ideo_%s.html" %
                        re.sub(r"\W+", "_", title)[:120])
    if force or not os.path.isfile(path):
        ok = False
        for attempt in range(3):
            r = requests.get("https://en.wikipedia.org/wiki/" +
                             requests.utils.quote(title.replace(" ", "_")),
                             headers=H, timeout=90)
            time.sleep(DELAY + attempt)
            if r.status_code == 200:
                open(path, "wb").write(r.content)
                ok = True
                break
        if not ok:
            return None
    return BeautifulSoup(open(path, encoding="utf8").read(), "lxml")


def ideology_from(soup):
    box = soup.find("table", class_=re.compile("infobox"))
    if not box:
        return None
    for tr in box.find_all("tr"):
        th = tr.find("th")
        if not th:
            continue
        lab = " ".join(th.get_text(" ", strip=True).split()).lower()
        if lab != "ideology":
            continue
        td = tr.find("td")
        if not td:
            continue
        raw = td.get_text("\n", strip=True)
        raw = re.sub(r"\[\s*\d+\s*\]", "", raw)
        # the text comes as lines; a parenthetical is its own "( / German / )"
        # triple and attaches to the item before it
        lines = [l.strip() for l in raw.split("\n") if l.strip()]
        items = []
        i = 0
        while i < len(lines):
            l = lines[i]
            if l == "(":
                j, buf = i + 1, []
                while j < len(lines) and lines[j] != ")":
                    buf.append(lines[j])
                    j += 1
                paren = "(" + " ".join(buf) + ")"
                if items:
                    items[-1] += " " + paren
                else:
                    items.append(paren)
                i = j + 1
                continue
            if l != ")":
                items.append(l)
            i += 1
        items = [" ".join(x.split()).strip(" ,;") for x in items]
        items = [x for x in items if x and len(x) <= 60]
        if not items:
            return None
        return ", ".join(items[:MAX_ITEMS])
    return None


def read_parties(country=None):
    """[(cc, pid, name_en)] from the config's party blocks."""
    text = open(os.path.join(ROOT, "js", "config.js"),
                encoding="utf8").read()
    out = []
    for m in re.finditer(r"\n  (\w+): \{", text):
        cc = m.group(1)
        if country and cc != country:
            continue
        end = text.find("\n  },", m.start())
        block = text[m.start():end]
        pb = re.search(r"parties:\s*\{", block)
        if not pb:
            continue
        k = block.index("{", pb.start())
        depth, e = 0, k
        while e < len(block):
            if block[e] == "{":
                depth += 1
            elif block[e] == "}":
                depth -= 1
                if depth == 0:
                    break
            e += 1
        body = block[k:e]
        for em in re.finditer(r"(\w+):\s*\{([^{}]*)\}", body):
            pid, inner = em.group(1), em.group(2)
            nm = re.search(r"name_en:\s*'([^']+)'", inner)
            if nm:
                out.append((cc, pid, nm.group(1)))
    return out


def main():
    force = "--force" in sys.argv
    repatch = "--repatch" in sys.argv
    country = None
    if "--country" in sys.argv:
        country = sys.argv[sys.argv.index("--country") + 1]
    parties = read_parties(country)
    print("parties to resolve:", len(parties))

    cfg_text = open(os.path.join(ROOT, "js", "config.js"),
                    encoding="utf8").read()
    country_names = dict(re.findall(r"\n  (\w+): \{\n    name: '([^']+)'",
                                    cfg_text))
    found, missing = {}, []
    for cc, pid, name in parties:
        idea = None
        for title in search_titles(name, country_names.get(cc)):
            soup = fetch(title, force)
            if not soup:
                continue
            idea = ideology_from(soup)
            if idea:
                break
        if idea:
            found[(cc, pid)] = idea
        else:
            missing.append("%s/%s (%s)" % (cc, pid, name))
    print("ideologies found:", len(found), "| missing:", len(missing))
    for x in missing[:20]:
        print("   no ideology:", x)

    # patch the config party entries
    path = os.path.join(ROOT, "js", "config.js")
    text = open(path, encoding="utf8").read()
    n = 0
    for m in list(re.finditer(r"\n  (\w+): \{", text))[::-1]:
        cc = m.group(1)
        if country and cc != country:
            continue
        end = text.find("\n  },", m.start())
        block = text[m.start():end]
        pb = re.search(r"parties:\s*\{", block)
        if not pb:
            continue
        k = block.index("{", pb.start())
        depth, e = 0, k
        while e < len(block):
            if block[e] == "{":
                depth += 1
            elif block[e] == "}":
                depth -= 1
                if depth == 0:
                    break
            e += 1
        body = block[k:e]
        for em in list(re.finditer(r"(\w+):\s*\{([^{}]*)\}", body))[::-1]:
            pid = em.group(1)
            idea = found.get((cc, pid))
            if not idea:
                continue
            if "ideology:" in em.group(2):
                if not repatch:
                    continue
                # overwrite the existing value in place
                abs_start = m.start() + k + em.start()
                abs_end = m.start() + k + em.end()
                span = text[abs_start:abs_end]
                new_span = re.sub(
                    r'ideology:\s*"[^"]*"',
                    "ideology: %s" % json.dumps(idea, ensure_ascii=False),
                    span)
                if new_span != span:
                    text = text[:abs_start] + new_span + text[abs_end:]
                    n += 1
                continue
            abs_end = m.start() + k + em.end() - 1  # the entry's closing }
            # trim the space before the closing brace so the entry reads
            # "color: '#...', ideology: ..." with no orphan space
            ins_at = abs_end
            while ins_at > 0 and text[ins_at - 1] == " ":
                ins_at -= 1
            ins = ", ideology: %s" % json.dumps(idea, ensure_ascii=False)
            text = text[:ins_at] + ins + text[abs_end:]
            n += 1
    open(path, "w", encoding="utf8", newline="").write(text)
    print("patched %d party entries" % n)


if __name__ == "__main__":
    main()

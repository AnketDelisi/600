#!/usr/bin/env python3
"""Canonicalize pollster names across a country's scraped polls.

Wikipedia polling tables spell the same pollster inconsistently: extra
spaces around "/", case differences, Greek/Latin homoglyphs (Marc/ΑΝΤ1)
and occasional shorthand (Pulse vs Pulse RC). This groups the polls by a
normalized key (spacing, case, homoglyphs + an optional per-country alias
map) and rewrites every poll to the group's most common spelling.

Usage:
    from pollster_norm import canonicalize_polls
    polls = canonicalize_polls(polls, ALIAS)
"""
import collections
import re

# Greek letters that look identical to Latin ones (used in Greek names)
HOMOGLYPHS = str.maketrans({
    "Α": "A", "Β": "B", "Ε": "E", "Ζ": "Z", "Η": "H", "Ι": "I", "Κ": "K",
    "Μ": "M", "Ν": "N", "Ο": "O", "Ρ": "P", "Τ": "T", "Υ": "Y", "Χ": "X",
    "α": "a", "β": "b", "ε": "e", "ζ": "z", "η": "n", "ι": "i", "κ": "k",
    "μ": "m", "ν": "v", "ο": "o", "ρ": "p", "τ": "t", "υ": "u", "χ": "x",
})


def norm_spacing(name):
    s = name.strip().translate(HOMOGLYPHS)
    s = re.sub(r"\s*/\s*", "/", s)
    return re.sub(r"\s+", " ", s).strip()


def canon_key(name, alias=None):
    key = re.sub(r"\s+", "", norm_spacing(name).casefold())
    if alias:
        key = alias.get(key, key)
    return key


def canonicalize_polls(polls, alias=None):
    """Rewrite each poll's pollster to the group's most common spelling."""
    groups = collections.defaultdict(collections.Counter)
    for p in polls:
        groups[canon_key(p["pollster"], alias)][p["pollster"]] += 1
    display = {}
    for key, variants in groups.items():
        best = max(variants.items(), key=lambda kv: (kv[1], kv[0]))[0]
        display[key] = norm_spacing(best)
    for p in polls:
        p["pollster"] = display[canon_key(p["pollster"], alias)]
    return polls

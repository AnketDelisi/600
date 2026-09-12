"""Mirror the live app files from the repo root into site/ (the local-dev copy).

The GitHub Pages site is served from the repo ROOT (js/, css/, poll/, sweden/,
us/, index.html). The site/ directory mirrors those files for local dev under
/site/. This script copies root -> site for exactly the mirrored paths, so the
two trees never drift.

Usage:
  python scraper/sync_site.py [--check]

--check only reports differences (exit 1 if any); without it, copies files.
Archives (archive/) and data/img/ are NOT mirrored here (snapshots manage
themselves; data/img live only in root).
"""
import argparse, os, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")

# paths (relative to ROOT) that are mirrored into site/
MIRRORED = [
    "index.html",
    "js/config.js",
    "js/parliaments.js",
    "js/app.js",
    "js/us.js",
    "css/style.css",
    "poll/index.html",
    "poll/poll.js",
    "sweden/index.html",
    "us/index.html",
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    diffs = []
    for rel in MIRRORED:
        src = os.path.join(ROOT, rel)
        dst = os.path.join(SITE, rel)
        if not os.path.isfile(src):
            diffs.append(("MISSING-ROOT", rel))
            continue
        if not os.path.isfile(dst):
            diffs.append(("MISSING-SITE", rel))
            continue
        with open(src, "rb") as a, open(dst, "rb") as b:
            if a.read() != b.read():
                diffs.append(("DIFF", rel))

    if args.check:
        if diffs:
            for kind, rel in diffs:
                print(f"[{kind}] {rel}")
            sys.exit(1)
        print("site/ is in sync with root")
        return

    if not diffs:
        print("site/ already in sync")
        return
    for kind, rel in diffs:
        if kind == "MISSING-ROOT":
            print(f"skip (no root file): {rel}")
            continue
        src = os.path.join(ROOT, rel)
        dst = os.path.join(SITE, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(src, dst)
        print(f"synced {rel}")
    print("done")


if __name__ == "__main__":
    main()
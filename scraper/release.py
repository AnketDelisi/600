#!/usr/bin/env python3
"""One-command release prep.

Bumps the cache token in the HTML entry points, mirrors site/, reports party
colour drift and runs the model audit. Never commits.

    python scraper/release.py              full: bump + sync + colours + audit
    python scraper/release.py --check      show the token it would use, no writes
    python scraper/release.py --no-colors  skip the (network) colour sync
    python scraper/release.py --no-audit   skip the audit
"""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTMLS = ["index.html", "poll/index.html", "sweden/index.html"]


def run(script, timeout=600):
    r = subprocess.run([sys.executable, str(ROOT / "scraper" / script)],
                       cwd=ROOT, capture_output=True, text=True,
                       encoding="utf8", errors="replace", timeout=timeout)
    return r


def main():
    check = "--check" in sys.argv
    idx = (ROOT / HTMLS[0]).read_text(encoding="utf8")
    m = re.search(r"\?v=(\d{8}[a-z])(\d+)", idx)
    if not m:
        sys.exit("no ?v= token found in " + HTMLS[0])
    old, new = m.group(0)[3:], m.group(1) + str(int(m.group(2)) + 1)
    print("token: %s -> %s%s" % (old, new, "  (check only)" if check else ""))
    if check:
        return

    for rel in HTMLS:
        p = ROOT / rel
        t = p.read_text(encoding="utf8")
        n = len(re.findall(re.escape(old), t))
        p.write_text(t.replace(old, new), encoding="utf8", newline="")
        print("  %-18s %d refs bumped" % (rel, n))

    r = run("sync_site.py")
    tail = [l for l in r.stdout.strip().splitlines() if l.strip()]
    print("  sync_site: %s" % (tail[-1] if tail else "?"))

    if "--no-colors" not in sys.argv:
        r = run("sync_party_colors.py", timeout=1200)
        tail = [l for l in r.stdout.strip().splitlines() if l.strip()]
        print("  colours: %s" % (tail[-1] if tail else "?"))

    if "--no-audit" not in sys.argv:
        r = run("audit.py")
        lines = [l for l in r.stdout.splitlines() if l.strip()]
        notes = [l for l in lines if "note:" in l]
        bad = [l for l in lines if "OK" not in l and "note:" not in l
               and not l.startswith(("=", "STRUCT", "CONFIG", "RESULT"))]
        if bad:
            print("  audit: %d issue(s)" % len(bad))
            for l in bad:
                print("    " + l)
        else:
            print("  audit: clean (%d documented note(s))" % len(notes))


if __name__ == "__main__":
    main()

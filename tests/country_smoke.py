#!/usr/bin/env python3
"""Headless country-page smoke: fail if a country page renders an empty pane."""
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PORT = 8125
BASE = "http://127.0.0.1:%d" % PORT
CASES = [
    ("/?c=serbia", "POLL AVERAGE"),
    ("/?c=brazil", "POLL AVERAGE"),
    ("/?c=bgpres", "POLL AVERAGE"),
    ("/", "Election calendar"),
]


def chrome():
    for name in (os.environ.get("CHROME_BIN"), "google-chrome", "chromium",
                 "chromium-browser", "chrome"):
        path = shutil.which(name) if name else None
        if path:
            return path
    for path in (r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                 r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"):
        if Path(path).exists():
            return path
    return None


def main():
    binary = chrome()
    if not binary:
        print("country smoke skipped: Chrome not found")
        return
    server = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"],
        cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(30):
            try:
                urllib.request.urlopen(BASE + "/", timeout=1)
                break
            except Exception:
                time.sleep(0.2)
        bad = 0
        for path, needle in CASES:
            profile = tempfile.mkdtemp(prefix="600-smoke-")
            try:
                out = subprocess.run(
                    [binary, "--headless=new", "--no-sandbox", "--disable-gpu",
                     "--no-proxy-server", "--user-data-dir=" + profile,
                     "--virtual-time-budget=12000", "--dump-dom", BASE + path],
                    capture_output=True, text=True, encoding="utf8", timeout=90)
                text = out.stdout or ""
                pane = re.search(r'id="pane-polls".*?(?=id="pane-forecast")', text, re.S)
                ok = needle.lower() in text.lower() and bool(pane and len(pane.group(0)) > 1000)
                print(("ok   " if ok else "FAIL ") + path)
                bad += 0 if ok else 1
            except Exception as exc:
                print("FAIL " + path + " " + str(exc))
                bad += 1
            finally:
                shutil.rmtree(profile, ignore_errors=True)
        if bad:
            raise SystemExit("%d country page smoke failures" % bad)
    finally:
        server.terminate()
        server.wait(timeout=10)


if __name__ == "__main__":
    main()

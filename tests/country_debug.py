#!/usr/bin/env python3
"""Render every 600 country page (polls + forecast) and report failures."""
import glob, os, re, shutil, subprocess, sys, tempfile, time, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PORT = 8130
BASE = "http://127.0.0.1:%d" % PORT
CHROME = shutil.which(os.environ.get("CHROME_BIN") or "google-chrome") or shutil.which("chromium") or shutil.which("chrome")
if not CHROME:
    for c in (r"C:\Program Files\Google\Chrome\Application\chrome.exe", r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"):
        if Path(c).exists(): CHROME = c; break

def cases():
    out = [("/", "GLOBAL ELECTION CALENDAR")]
    for f in glob.glob(str(ROOT / "data" / "*" / "meta.json")):
        cc = Path(f).parent.name
        out.append(("/?c=" + cc, "POLL AVERAGE"))
        out.append(("/?c=" + cc + "&t=forecast", "FORECAST"))
    return out

def main():
    if not CHROME:
        print("skipped: Chrome not found"); return
    server = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(30):
            try: urllib.request.urlopen(BASE + "/", timeout=1); break
            except Exception: time.sleep(.2)
        bad = []
        for path, needle in cases():
            profile = tempfile.mkdtemp(prefix="600-debug-")
            try:
                r = subprocess.run([CHROME, "--headless=new", "--no-sandbox", "--disable-gpu", "--no-proxy-server",
                    "--user-data-dir=" + profile, "--virtual-time-budget=9000", "--dump-dom", BASE + path],
                    capture_output=True, text=True, encoding="utf8", timeout=60)
                text = r.stdout or ""
                pane = re.search(r'id="pane-polls".*?(?=id="pane-forecast")', text, re.S)
                ok = needle.lower() in text.lower() and bool(pane and len(pane.group(0)) > 500)
                print(("ok   " if ok else "FAIL ") + path)
                if not ok: bad.append(path)
            except Exception as exc:
                print("FAIL " + path + " " + str(exc)); bad.append(path)
            finally:
                shutil.rmtree(profile, ignore_errors=True)
        print("---"); print(len(cases()), "pages,", len(bad), "failed")
        if bad:
            print("FAILED:", " ".join(bad)); raise SystemExit(1)
    finally:
        server.terminate(); server.wait(timeout=10)

if __name__ == "__main__":
    main()

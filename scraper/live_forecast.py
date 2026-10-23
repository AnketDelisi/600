#!/usr/bin/env python3
"""Refresh the 600 forecast snapshots used by the live results page.

Run from the 600 repo:
    python scraper/live_forecast.py

The live page is static; this script renders the existing 600 forecast pages in
headless Chrome and freezes the expected vote shares and projected map.
"""
import json
import re
import shutil
import subprocess
import tempfile
import threading
import time
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
LIVE = ROOT / "data" / "live"
TARGETS = {
    "bc-2026": ("bc", "bc-2026.json"),
    "serbia-2026": ("serbia", "serbia-2026.json"),
    "brazil-2026-r2": ("brazil", "brazil-2026-r2.json"),
    "bulgaria-2026": ("bgpres", "bulgaria-2026.json"),
}


def chrome_path():
    for name in ("google-chrome", "chromium", "chrome", "chrome.exe"):
        found = shutil.which(name)
        if found:
            return found
    for candidate in (
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    ):
        if Path(candidate).exists():
            return candidate
    raise SystemExit("Chrome not found")


def parse_pct(text):
    match = re.search(r"-?\d+(?:\.\d+)?", text or "")
    return float(match.group(0)) if match else None


def parse_interval(text):
    match = re.search(r"(-?\d+(?:\.\d+)?)\s*[–-]\s*(-?\d+(?:\.\d+)?)", text or "")
    return (float(match.group(1)), float(match.group(2))) if match else (None, None)


def main():
    class QuietHandler(SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), QuietHandler)
    server.RequestHandlerClass.directory = str(ROOT)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    port = server.server_address[1]
    chrome = chrome_path()
    try:
        for election, (slug, live_file) in TARGETS.items():
            url = f"http://127.0.0.1:{port}/index.html?c={slug}&t=forecast"
            with tempfile.TemporaryDirectory() as profile:
                result = subprocess.run(
                    [chrome, "--headless=new", "--no-sandbox", "--disable-gpu",
                     "--no-proxy-server", "--virtual-time-budget=20000",
                     f"--user-data-dir={profile}", "--dump-dom", url],
                    capture_output=True, text=True, encoding="utf8",
                    errors="replace", timeout=120,
                )
            if result.returncode:
                raise SystemExit(f"{election}: chrome failed: {result.stderr[-500:]}")
            html = result.stdout
            soup = BeautifulSoup(html, "lxml")
            label = soup.select_one(".fc-headline-label")
            number = soup.select_one(".fc-headline-num")
            headline = " ".join(x.get_text(" ", strip=True) for x in (label, number) if x)
            shares = []
            live = json.loads((LIVE / live_file).read_text(encoding="utf8"))
            by_color = {str(e.get("color", "")).lower(): e for e in live.get("entries", [])}
            for row in soup.select(".fc-voterow"):
                lab = row.select_one(".fc-row-label")
                if not lab:
                    continue
                color_match = re.search(r"color:\s*([^;]+)", lab.get("style", ""))
                color = color_match.group(1).strip() if color_match else ""
                entry = by_color.get(color.lower())
                pct = parse_pct((row.select_one(".fc-vote-val") or {}).get_text(" ", strip=True) if row.select_one(".fc-vote-val") else "")
                lo, hi = parse_interval((row.select_one(".fc-vote-int") or {}).get_text(" ", strip=True) if row.select_one(".fc-vote-int") else "")
                shares.append({
                    "id": entry.get("id") if entry else lab.get_text(strip=True),
                    "name": entry.get("name") if entry else lab.get_text(strip=True),
                    "label": lab.get_text(strip=True),
                    "color": color or (entry.get("color") if entry else "#6B7280"),
                    "pct": pct,
                    "lo": lo,
                    "hi": hi,
                    "trend": (row.select_one(".fc-mom").get_text(" ", strip=True) if row.select_one(".fc-mom") else ""),
                })
            if not shares:
                raise SystemExit(f"{election}: no forecast shares found")
            start = html.find('id="fc-map-box"')
            end = html.find("</svg>", start) + len("</svg>") if start >= 0 else -1
            map_svg = html[html.find("<svg", start):end] if start >= 0 and end > 0 else ""
            if not map_svg:
                raise SystemExit(f"{election}: no forecast map found")
            map_svg = map_svg.replace(
                "<svg", f'<svg role="img" aria-label="{live.get("name", election)} projected map" class="live-forecast-svg"', 1
            )
            map_svg = re.sub(r">\s+<", "><", map_svg)
            (LIVE / f"forecast-{election}.svg").write_text(map_svg, encoding="utf8")
            caption = soup.select_one("#fc-map-cap")
            caption_text = caption.get_text(" ", strip=True) if caption else ""
            caption_text = re.sub(r"\s*·\s*hover.*$", "", caption_text)
            payload = {
                "election": election,
                "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "headline": headline,
                "shares": shares,
                "map_url": f"forecast-{election}.svg",
                "map_caption": caption_text,
                "source": "600 forecast",
            }
            (LIVE / f"forecast-{election}.json").write_text(
                json.dumps(payload, ensure_ascii=False, indent=1) + "\n", encoding="utf8"
            )
            print(f"{election}: {len(shares)} shares, map {len(map_svg):,} bytes")
    finally:
        server.shutdown()


if __name__ == "__main__":
    main()

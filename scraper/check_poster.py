#!/usr/bin/env python3
"""Validate the poster smoke-test dump.

The tests/poster_smoke.html harness writes the poster's captured download
data URL into the DOM; this checks that it decodes to a real PNG of the
expected size. Run after headless Chrome dumps that page:

    python scraper/check_poster.py <dump.html>
"""
import base64
import re
import struct
import sys
from pathlib import Path

if len(sys.argv) < 2:
    sys.exit(__doc__)
text = Path(sys.argv[1]).read_text(encoding="utf8", errors="replace")
m = re.search(r'<pre id="dlurl">(data:image/png;base64,[^<]+)</pre>', text)
if not m:
    sys.exit("poster smoke test: no data URL in the dump "
             "(the button click or the render failed)")
data = base64.b64decode(m.group(1).split(",", 1)[1])
if data[:8] != b"\x89PNG\r\n\x1a\n":
    sys.exit("poster smoke test: captured data is not a PNG")
if len(data) < 50000:
    sys.exit("poster smoke test: PNG suspiciously small (%d bytes)"
             % len(data))
w, h = struct.unpack(">II", data[16:24])
if (w, h) != (3200, 1800):
    sys.exit("poster smoke test: unexpected dimensions %dx%d" % (w, h))
print("poster smoke test OK: %d bytes, %dx%d" % (len(data), w, h))

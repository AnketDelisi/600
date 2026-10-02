"""Build a constituency/district SVG from an official boundary shapefile.

Instead of hand-drawing one SVG per country/state, download the official
boundary shapefile and emit an SVG whose <path> ids match what the site's
map engine expects (js/app.js renderMapInto):

  default selector: path[id^="_"], nr = digits after the underscore
  -> id "_28" is Wahlkreis 28; conf.districts maps nr -> region name.

Default target: Landtagswahlkreise Mecklenburg-Vorpommern 2026 (36),
official KLWK250MV shapefile of the LAiV MV Amt fuer Geoinformation,
(c) GeoBasis-DE/M-V, CC BY 4.0. Coordinates are ETRS89/UTM33N (metres)
and are used directly for the SVG (conformal; no reprojection needed).

Usage:
  python scraper/build_map_svg.py
  python scraper/build_map_svg.py --zip URL --shp inner/path.shp \
      --id-field WkNr --out bmv/img/mecklenburg_vorpommern.gen.svg
"""
import argparse
import math
import os
import struct
import sys
import urllib.request
import zipfile

ROOT = os.path.join(os.path.dirname(__file__), "..")
DEFAULT_ZIP = ("https://www.laiv-mv.de/static/LAIV/Geoinformation/"
               "Dateien/Karten/LTwahl_Wahlkreise.zip")
DEFAULT_SHP = "LTwahl_Wahlkreise.shp"
DEFAULT_OUT = os.path.join(ROOT, "bmv", "img",
                           "mecklenburg_vorpommern.gen.svg")
ATTRIBUTION = ("Wahlkreisgeometrien: (c) GeoBasis-DE/M-V / CC BY 4.0 — "
               "Amt fuer Geoinformation, Vermessungs- und Katasterwesen "
               "(LAiV MV), Sonderausgabe KLWK250MV")


def fetch(zip_url, cache_dir, force=False):
    os.makedirs(cache_dir, exist_ok=True)
    path = os.path.join(cache_dir, os.path.basename(zip_url))
    if force or not os.path.exists(path):
        req = urllib.request.Request(zip_url,
                                     headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=120) as r, \
                open(path, "wb") as f:
            f.write(r.read())
        print(f"downloaded {zip_url}")
    return path


def extract(zip_path, shp_name, cache_dir):
    out = os.path.join(cache_dir, "extract")
    os.makedirs(out, exist_ok=True)
    with zipfile.ZipFile(zip_path) as z:
        z.extractall(out)
    for root, _, files in os.walk(out):
        for fn in files:
            if fn.lower() == os.path.basename(shp_name).lower():
                return os.path.join(root, fn)
    sys.exit(f"{shp_name} not found in {zip_path}")


def read_dbf(dbf_path):
    """Return (field_names, records) for a dBase table."""
    raw = open(dbf_path, "rb").read()
    n_rec = struct.unpack_from("<I", raw, 4)[0]
    hdr = struct.unpack_from("<H", raw, 8)[0]
    rec_size = struct.unpack_from("<H", raw, 10)[0]
    fields, pos = [], 32
    while raw[pos] != 0x0D:
        name = raw[pos:pos + 11].split(b"\x00")[0].decode("ascii", "replace")
        fields.append((name, raw[pos + 16]))
        pos += 32
    enc = "utf-8"
    cpg = dbf_path[:-4] + ".cpg"
    if os.path.exists(cpg):
        enc = open(cpg, encoding="ascii").read().strip() or enc
    records = []
    for i in range(n_rec):
        off = hdr + i * rec_size + 1
        rec = {}
        for name, flen in fields:
            rec[name] = raw[off:off + flen].decode(enc, "replace").strip()
            off += flen
        records.append(rec)
    return [f[0] for f in fields], records


def read_shp(shp_path):
    """Yield (record_index, [ring, ...]) for polygon shapefiles."""
    raw = open(shp_path, "rb").read()
    off, i = 100, 0
    while off < len(raw):
        _, clen = struct.unpack_from(">ii", raw, off)
        st = struct.unpack_from("<i", raw, off + 8)[0]
        if st == 5:
            num_parts, num_points = struct.unpack_from("<ii", raw, off + 44)
            parts = struct.unpack_from(f"<{num_parts}i", raw, off + 52)
            p_off = off + 52 + 4 * num_parts
            pts = struct.unpack_from(f"<{2 * num_points}d", raw, p_off)
            rings = []
            for k in range(num_parts):
                a = parts[k]
                b = parts[k + 1] if k + 1 < num_parts else num_points
                rings.append([(pts[2 * j], pts[2 * j + 1])
                              for j in range(a, b)])
            yield i, rings
        i += 1
        off += 8 + clen * 2


def simplify(pts, eps):
    """Douglas-Peucker simplification (iterative)."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i, j = stack.pop()
        if j <= i + 1:
            continue
        x1, y1 = pts[i]
        x2, y2 = pts[j]
        dx, dy = x2 - x1, y2 - y1
        l2 = dx * dx + dy * dy
        best, bestd = -1, -1.0
        for k in range(i + 1, j):
            px, py = pts[k]
            if l2 == 0:
                d = (px - x1) ** 2 + (py - y1) ** 2
            else:
                t = max(0.0, min(1.0, ((px - x1) * dx +
                                       (py - y1) * dy) / l2))
                d = (px - (x1 + t * dx)) ** 2 + (py - (y1 + t * dy)) ** 2
            if d > bestd:
                best, bestd = k, d
        if bestd > eps * eps:
            keep[best] = True
            stack.append((i, best))
            stack.append((best, j))
    return [p for p, k in zip(pts, keep) if k]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--zip", default=DEFAULT_ZIP)
    ap.add_argument("--shp", default=DEFAULT_SHP,
                    help="shapefile name inside the zip")
    ap.add_argument("--id-field", default="WkNr")
    ap.add_argument("--id-prefix", default="_")
    ap.add_argument("--label-field", default="text")
    ap.add_argument("--out", default=DEFAULT_OUT)
    ap.add_argument("--simplify", type=float, default=0.0005,
                    help="DP tolerance as a fraction of the bbox diagonal")
    ap.add_argument("--width", type=int, default=1000)
    ap.add_argument("--force", action="store_true", help="re-download zip")
    args = ap.parse_args()

    cache = os.path.join(ROOT, "scraper", ".cache")
    shp_path = extract(fetch(args.zip, cache, args.force), args.shp, cache)
    fields, records = read_dbf(shp_path[:-4] + ".dbf")
    geoms = list(read_shp(shp_path))
    if len(geoms) != len(records):
        sys.exit(f"record mismatch: {len(geoms)} shapes vs {len(records)} rows")
    if args.id_field not in fields:
        sys.exit(f"id field '{args.id_field}' not in {fields}")

    xs = [x for _, rings in geoms for r in rings for x, _ in r]
    ys = [y for _, rings in geoms for r in rings for _, y in r]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    eps = args.simplify * math.hypot(x1 - x0, y1 - y0)
    pad = 20
    scale = (args.width - 2 * pad) / (x1 - x0)
    height = round((y1 - y0) * scale + 2 * pad, 1)

    paths, pts_in, pts_out, ids = [], 0, 0, []
    for idx, rings in geoms:
        rec = records[idx]
        ids.append(f"{args.id_prefix}{rec[args.id_field]}")
        d = []
        for ring in rings:
            pts_in += len(ring)
            s = simplify(ring, eps)
            pts_out += len(s)
            d.append("M" + "L".join(
                f"{(x - x0) * scale + pad:.1f},{(y1 - y) * scale + pad:.1f}"
                for x, y in s) + "Z")
        paths.append(f'<path id="{ids[-1]}" d="{" ".join(d)}"/>')

    svg = "\n".join([
        f"<!-- {ATTRIBUTION} -->",
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '
        f'{args.width} {height}" width="{args.width}" height="{height}">',
        '<g fill="#E5E7EB" stroke="#111827" stroke-width="1" '
        'stroke-linejoin="round" fill-rule="evenodd">',
        *paths,
        "</g>",
        "</svg>",
        "",
    ])
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf8") as f:
        f.write(svg)
    print(f"{len(paths)} paths | ids {ids[0]}..{ids[-1]} | "
          f"points {pts_in} -> {pts_out} | {os.path.getsize(args.out)} bytes")
    print(f"viewBox 0 0 {args.width} {height} | wrote {args.out}")


if __name__ == "__main__":
    main()

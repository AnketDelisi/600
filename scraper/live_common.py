"""Shared write/update helpers for the 600 live-results page."""
import json
import os
from datetime import datetime, timezone

ROOT = os.path.join(os.path.dirname(__file__), "..")
LIVE_DIR = os.path.join(ROOT, "data", "live")
INDEX = os.path.join(LIVE_DIR, "index.json")


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load_index():
    with open(INDEX, encoding="utf8") as fh:
        return json.load(fh)


def append_history(election, payload):
    """Append a compact snapshot for the result-over-the-count chart."""
    entries = payload.get("entries") or []
    shares = {e["id"]: round(float(e["pct"]), 3) for e in entries
              if e.get("id") and e.get("pct") is not None and float(e["pct"]) > 0}
    if not shares or payload.get("status") == "waiting":
        return
    counted, total = payload.get("counted"), payload.get("total")
    counted_pct = round(counted / total * 100, 2) if counted and total else None
    snap = {
        "at": payload["updated_at"],
        "counted": counted,
        "total": total,
        "counted_pct": counted_pct,
        "pct": shares,
        "seats": {e["id"]: e.get("seats") for e in entries
                  if e.get("id") and e.get("seats")},
    }
    path = os.path.join(LIVE_DIR, "history-" + election + ".json")
    history = {"election": election, "snapshots": []}
    if os.path.exists(path):
        with open(path, encoding="utf8") as fh:
            history = json.load(fh)
    snaps = history.setdefault("snapshots", [])
    if snaps:
        last = snaps[-1]
        if last.get("counted_pct") == counted_pct and last.get("pct") == shares:
            return
    snaps.append(snap)
    history["snapshots"] = snaps[-1000:]
    with open(path, "w", encoding="utf8") as fh:
        json.dump(history, fh, ensure_ascii=False, indent=1)


def write_live(election, payload):
    """Write one election snapshot and update its nav status."""
    payload = dict(payload)
    payload.setdefault("id", election)
    payload["updated_at"] = now_iso()
    path = os.path.join(LIVE_DIR, election + ".json")
    if os.path.exists(path):
        with open(path, encoding="utf8") as fh:
            old = json.load(fh)
        if old.get("status") in ("counting", "final") and payload.get("status") == "waiting" and not payload.get("counted"):
            print("skip", election, "would replace counted data with a waiting snapshot")
            return
        old_count, new_count = old.get("counted"), payload.get("counted")
        if (old.get("status") in ("counting", "final") and old_count is not None
                and new_count is not None and new_count < old_count):
            print("skip", election, "count went backwards", old_count, "->", new_count)
            return
        if (old.get("status") in ("counting", "final") and old_count is not None
                and new_count is None):
            payload["counted"] = old_count
            payload["total"] = old.get("total")
            payload["counted_label"] = old.get("counted_label", payload.get("counted_label"))
        old.pop("updated_at", None)
        new = dict(payload)
        new.pop("updated_at", None)
        if old == new:
            print("unchanged", election)
            return
    with open(path, "w", encoding="utf8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=1)

    append_history(election, payload)

    idx = load_index()
    for row in idx.get("elections", []):
        if row.get("id") == election:
            row["status"] = payload.get("status", row.get("status"))
            row["updated_at"] = payload["updated_at"]
            break
    with open(INDEX, "w", encoding="utf8") as fh:
        json.dump(idx, fh, ensure_ascii=False, indent=1)
    print("wrote", path, "|", payload.get("status"),
          payload.get("counted"), "/", payload.get("total"))


def source_note(source, url):
    return {"source": source, "source_url": url}

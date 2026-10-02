#!/usr/bin/env python3
"""Rebuild keyword-queue.json from today's competitor-scout output.

Used after a lost/drained queue (2026-10-02: parallel-publish drained 36 topics
and died before publishing them). Re-derives keywords from data/competitors/*.json
for the most recent date and writes valid, de-duplicated entries.
"""
import glob
import json
import os
import re
import sys
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CDIR = os.path.join(ROOT, "data", "competitors")
QUEUE = os.path.join(ROOT, "scripts", "keyword-queue.json")

STOP = {
    "home", "blog", "news", "about", "contact", "privacy", "terms", "login",
    "signup", "search", "category", "categories", "tag", "tags", "archive",
    "author", "page", "posts", "post", "guide", "guides", "resources", "tools",
    "reviews", "best", "top", "new", "latest", "video", "videos", "podcast",
}


def slugify(s: str) -> str:
    s = re.sub(r"[^\w\s-]", "", s.lower())
    return re.sub(r"[-\s]+", "-", s).strip("-")


def main() -> int:
    if not os.path.isdir(CDIR):
        print("no data/competitors dir")
        return 1
    files = glob.glob(os.path.join(CDIR, "*.json"))
    if not files:
        print("no competitor files")
        return 1
    newest = max(os.path.basename(f) for f in files)
    day = newest.rsplit("-", 2)[-2] + "-" + newest.rsplit("-", 1)[-1].replace(".json", "")
    today_files = [f for f in files if os.path.basename(f).endswith(f"{day}.json")]

    existing = []
    if os.path.exists(QUEUE):
        try:
            existing = json.load(open(QUEUE, encoding="utf-8"))
        except Exception:
            existing = []

    seen = set()
    out = []
    for item in existing:
        key = (item.get("keyword") or item.get("topic") or "") if isinstance(item, dict) else str(item)
        if key and key not in seen:
            seen.add(key)
            out.append(item)

    added = 0
    for f in sorted(today_files):
        try:
            data = json.load(open(f, encoding="utf-8"))
        except Exception:
            continue
        urls = data if isinstance(data, list) else data.get("urls") or data.get("topics") or []
        for u in urls:
            if isinstance(u, dict):
                raw = u.get("keyword") or u.get("topic") or u.get("url") or ""
            else:
                raw = str(u)
            if not raw:
                continue
            kw = re.sub(r"^https?://[^/]+/?", "", raw).strip("/")
            kw = kw.replace("-", " ").replace("/", " ").strip()
            if not kw or len(kw) < 4 or len(kw) > 70:
                continue
            low = kw.lower()
            if low in STOP or any(low == s or low.startswith(s + " ") for s in STOP):
                continue
            if not re.search(r"\b(ai|artificial intelligence|machine learning|llm|chatgpt|gemini|claude|automation|agent|neural|gpt|model)\b", low):
                continue
            k = kw.lower()
            if k in seen:
                continue
            seen.add(k)
            out.append({"keyword": kw, "slug": slugify(kw), "source": os.path.basename(f), "date": datetime.now().strftime("%Y-%m-%d")})
            added += 1

    json.dump(out, open(QUEUE, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    print(f"queue rebuilt from {len(today_files)} competitor file(s) for {day}: +{added} new, {len(out)} total")
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Repair stray bare image lines after a cover: key + nested post links.

- stray cover: an indented bare /images/... or http... line directly under
  `cover:` with no key -> Next.js build fails with
  "bad indentation of a mapping entry at line N".
- nested link:  ](text( /posts/x ))  -> collapse to the single valid link,
  never dropping the link itself.
"""
import glob, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTS = os.path.join(ROOT, "content", "posts")

NESTED_INNER = re.compile(r"\]\(\(/posts/([a-z0-9-]+)\)\)")
NESTED_OUTER = re.compile(r"\]\((https?://[^\s)]*?)\]\(/posts/([a-z0-9-]+)\)\)")


def fix_nested(text: str) -> str:
    # ](inner ](/posts/x))  -> ](/posts/x)
    prev = None
    while prev != text:
        prev = text
        text = NESTED_INNER.sub(r"](/posts/\1)", text)
    # ](https://... ](/posts/x)  -> ](/posts/x)
    text = NESTED_OUTER.sub(r"](/posts/\2)", text)
    return text


def fix_stray_cover(raw: str) -> str:
    lines = re.split(r"(\n?\n)", raw)
    out = [lines[0]]
    for i in range(2, len(lines), 2):
        cur = lines[i]
        nxt = lines[i + 2] if i + 2 < len(lines) else None
        s = cur.strip()
        if s.startswith("cover:") and nxt is not None:
            t = nxt.strip()
            if t.startswith("/images/") or (
                t.startswith("http") and ":" not in t and t.endswith((".jpg", ".png", ".webp"))
            ):
                continue  # drop the stray line
        out.append(cur)
    return "".join(out)


def main() -> int:
    stray = nested = 0
    for path in sorted(glob.glob(os.path.join(POSTS, "*.mdx"))):
        original = open(path, "r", encoding="utf-8", newline="").read()
        updated = fix_stray_cover(original)
        if updated != original:
            stray += 1
        updated = fix_nested(updated)
        if updated != original:
            nested += 1
        if updated != original:
            open(path, "w", encoding="utf-8", newline="").write(updated)
    print(f"stray-cover files fixed: {stray}")
    print(f"nested-link files fixed: {nested}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Pre-push validator: YAML frontmatter on every post + defect counts.

CRLF-safe: splits on /\\n?\\n/ and trims (a ^---\\n anchor silently matches nothing
on Windows and falsely reports every post as broken).
"""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTS = os.path.join(ROOT, "content", "posts")

try:
    import yaml
except ImportError:
    yaml = None

bad, no_fm, markers, nested, stray_cover = [], [], [], [], []
files = sorted(glob.glob(os.path.join(POSTS, "*.mdx")))

for path in files:
    name = os.path.basename(path)
    raw = open(path, "r", encoding="utf-8", newline="").read()
    if re.search(r"^(<<<<<<<|=======|>>>>>>>)", raw, re.MULTILINE):
        markers.append(name)
    # NOTE: only compare the *stripped* form to find the fences; the frontmatter
    # block itself must keep its original indentation or YAML block scalars
    # (excerpt: >- / description: >-) lose their continuation lines and fail to
    # parse — which reads as 677 "bad" posts that are actually valid.
    raw_lines = re.split(r"\n?\n", raw)
    lines = [l.strip() for l in raw_lines]
    if not lines or lines[0] != "---":
        no_fm.append(name)
        continue
    try:
        end = next(i for i in range(1, len(lines)) if lines[i] == "---")
    except StopIteration:
        no_fm.append(name)
        continue
    block = "\n".join(raw_lines[1:end])
    if yaml is not None:
        try:
            data = yaml.safe_load(block)
            if not isinstance(data, dict):
                bad.append((name, "frontmatter is not a mapping"))
            else:
                for req in ("title", "date"):
                    if req not in data:
                        bad.append((name, f"missing '{req}'"))
        except Exception as e:
            bad.append((name, str(e).split("\n")[0][:90]))
    # stray bare image line right after a cover: line
    body_lines = re.split(r"\n?\n", raw)
    for i, l in enumerate(body_lines):
        s = l.strip()
        if s.startswith("cover:") and i + 1 < len(body_lines):
            nxt = body_lines[i + 1].strip()
            if nxt.startswith("/images/") or (nxt.startswith("http") and ":" not in nxt and nxt.endswith((".jpg", ".png", ".webp"))):
                stray_cover.append(name)
                break
    if re.search(r"\]\(/posts/[^)]*\]\(/posts/", raw):
        nested.append(name)

print(f"posts scanned      : {len(files)}")
print(f"missing frontmatter: {len(no_fm)}")
print(f"bad frontmatter    : {len(bad)}")
print(f"conflict markers   : {len(markers)}")
print(f"stray cover lines  : {len(stray_cover)}")
print(f"nested broken links: {len(nested)}")
for label, items in (("NO_FRONTMATTER", no_fm), ("MARKERS", markers), ("STRAY_COVER", stray_cover), ("NESTED", nested)):
    for it in items[:8]:
        print(f"  {label}: {it}")
for name, msg in bad[:10]:
    print(f"  BAD: {name} -> {msg}")
sys.exit(0 if not (bad or no_fm or markers or stray_cover) else 1)

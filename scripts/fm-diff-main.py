#!/usr/bin/env python3
"""Compare frontmatter parse status between origin/main blobs and the worktree."""
import glob, os, re, subprocess, sys
import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTS = os.path.join(ROOT, "content", "posts")

def fm_ok(raw):
    lines = [l.strip() for l in re.split(r"\n?\n", raw)]
    if not lines or lines[0] != "---":
        return None
    try:
        end = next(i for i in range(1, len(lines)) if lines[i] == "---")
    except StopIteration:
        return None
    try:
        d = yaml.safe_load("\n".join(lines[1:end]))
        return isinstance(d, dict)
    except Exception:
        return False

names = sorted(os.path.basename(p) for p in glob.glob(os.path.join(POSTS, "*.mdx")))[:40]
main_bad = local_bad = 0
examples = []
for n in names:
    try:
        blob = subprocess.run(["git", "show", f"origin/main:content/posts/{n}"],
                              cwd=ROOT, capture_output=True, timeout=30).stdout.decode("utf-8", "replace")
    except Exception:
        continue
    if not blob:
        continue
    r_main = fm_ok(blob)
    r_loc = fm_ok(open(os.path.join(POSTS, n), "r", encoding="utf-8", newline="").read())
    if r_main is False:
        main_bad += 1
        examples.append(("MAIN", n))
    if r_loc is False:
        local_bad += 1
        examples.append(("LOCAL", n))

print(f"sampled            : {len(names)}")
print(f"bad on origin/main : {main_bad}")
print(f"bad in worktree    : {local_bad}")
for tag, n in examples[:10]:
    print(f"  {tag}: {n}")

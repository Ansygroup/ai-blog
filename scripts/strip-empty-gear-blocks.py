"""idempotent: remove an '## Recommended Gear' heading that has NO content.

Context: the 2026-08-26 Amazon removal deleted the gear bullets but left the
heading behind in 762 posts. An empty '## Recommended Gear' is a visible dead
section in the rendered article, so it is a content defect, not cosmetic.

WHY LINE-BASED (never blank-line-split): splitting on `(\\n?\\n)` and rejoining
drops the blank-line separators, which glues the frontmatter of every post
into one line and yields `missing frontmatter: 718`. Locate the closing ---
fence on the ORIGINAL lines, then parse that block.

SAFETY: a section is only removed when every line up to the next heading is
blank. A '## Recommended Gear' that still holds real text (posts with genuine
surf/gear lists not built from Amazon) is LEFT ALONE. The run aborts if any
post would lose its frontmatter or its body.

Idempotent: a second run reports files touched: 0.
Usage: python scripts/strip-empty-gear-blocks.py [--dir <posts-dir>]
Exit 1 if any empty gear heading survives (so CI can gate on it).
"""
import argparse
import glob
import os
import re
import sys

HEAD = re.compile(r'^#{2,3}\s*recommended gear\s*$', re.I)


def frontmatter_end(lines):
    """Index of the closing --- line, or -1 when there is no frontmatter."""
    start = 0
    while start < len(lines) and not lines[start].strip():
        start += 1
    if start >= len(lines) or lines[start].strip() != '---':
        return -1
    for i in range(start + 1, len(lines)):
        if lines[i].strip() == '---':
            return i
    return -1


def clean(path):
    """Remove empty gear headings. Returns count removed, or None if untouched."""
    raw = open(path, 'rb').read().decode('utf-8', 'replace')
    nl = '\r\n' if '\r\n' in raw else '\n'
    lines = raw.split(nl)
    fm_end = frontmatter_end(lines)
    if fm_end < 0:
        return None                      # no frontmatter -> never touch

    keep, removed, i = [], 0, 0
    while i < len(lines):
        if i > fm_end and HEAD.match(lines[i].strip()):
            j = i + 1
            has_content = False
            while j < len(lines) and not lines[j].startswith('#'):
                if lines[j].strip():
                    has_content = True
                    break
                j += 1
            if not has_content:
                removed += 1
                i = j
                continue
        keep.append(lines[i])
        i += 1

    if not removed:
        return None

    out = '\n'.join(keep)
    check = out.split(nl)
    if frontmatter_end(check) != fm_end:
        print(f'ABORT frontmatter lost: {os.path.basename(path)}')
        sys.exit(2)
    if not any(l.strip() for l in check[fm_end + 1:]):
        print(f'ABORT body emptied: {os.path.basename(path)}')
        sys.exit(2)

    open(path, 'wb').write(out.encode('utf-8'))
    return removed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dir', default=None,
                    help='posts dir (default: <repo>/content/posts)')
    a = ap.parse_args()
    posts = a.dir or os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                  '..', 'content', 'posts')
    posts = os.path.abspath(posts)

    files = sorted(glob.glob(os.path.join(posts, '*.mdx')))
    touched = total = 0
    for f in files:
        n = clean(f)
        if n:
            touched += 1
            total += n
    print(f'posts scanned   : {len(files)}')
    print(f'files touched   : {touched}')
    print(f'headings removed: {total}')

    left_empty = left_full = 0
    for f in files:
        lines = open(f, 'rb').read().decode('utf-8', 'replace').split('\n')
        for i, l in enumerate(lines):
            if HEAD.match(l.strip()):
                j, has = i + 1, False
                while j < len(lines) and not lines[j].startswith('#'):
                    if lines[j].strip():
                        has = True
                        break
                    j += 1
                if has:
                    left_full += 1
                else:
                    left_empty += 1
    print(f'left empty      : {left_empty}')
    print(f'left with text  : {left_full}')
    return 0 if left_empty == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
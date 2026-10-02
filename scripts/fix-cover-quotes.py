#!/usr/bin/env python3
"""Repair duplicated-quote `cover:` values in MDX frontmatter.

Defect: content bots re-append the cover value onto an existing `cover:` line,
accumulating stray trailing quote characters:

    cover: "/images/foo.jpg' + '"' * 3

which makes the whole frontmatter block unparseable YAML
("unexpected end of the stream within a double quoted scalar"), failing
`node scripts/seo-audit.js` -> deploy.yml audit job -> `needs: audit` blocks
the production deploy.

Safety contract (see ai-blog-ops pitfalls):
  * LINE-BASED only. Never split on blank lines and rejoin - that destroys
    YAML block scalars (`excerpt: >-` continuation lines).
  * Re-parse the frontmatter after the rewrite; if the result does not parse,
    SKIP the file (never write a broken rewrite).
  * Only touches the `cover:` key. Other keys are left byte-identical.
  * Idempotent: running twice reports 0 changes the second time.

Usage:
  python scripts/fix-cover-quotes.py          # dry run, report only
  python scripts/fix-cover-quotes.py --apply  # write fixes
"""
import os
import re
import sys

try:
    import yaml
except ImportError:
    sys.exit("PyYAML required: py -m pip install pyyaml")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTS = os.path.join(ROOT, "content", "posts")
APPLY = "--apply" in sys.argv

# cover: "/images/foo.jpg"  -> capture the clean URL, tolerate any extra quotes
COVER_RE = re.compile(r'^(cover:\s*)"(\/[^"\n]*?)"+"(\s*)$')

# a cover value that is itself legitimately quoted but closed properly = fine
CLOSED_RE = re.compile(r'^cover:\s*"[^"]*"\s*$')


def frontmatter_lines(raw):
    """Return (start, end) line indexes of the YAML block, or None.

    Line-based on the ORIGINAL lines (strip only used to locate the fences).
    """
    lines = raw.split("\n")
    if not lines or lines[0].strip() != "---":
        return None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            return 0, i
    return None


def parse_ok(block_lines):
    try:
        data = yaml.safe_load("\n".join(block_lines))
        return isinstance(data, dict)
    except Exception:
        return False


def repair(raw):
    """Return (new_raw, changed) or (None, False) when untouched/unrepairable."""
    span = frontmatter_lines(raw)
    if span is None:
        return None, False
    start, end = span
    lines = raw.split("\n")
    out = list(lines)
    changed = False
    for i in range(start + 1, end):
        line = lines[i]
        if not line.startswith("cover:"):
            continue
        if CLOSED_RE.match(line):
            continue  # already well-formed
        m = COVER_RE.match(line.rstrip("\r"))
        if not m:
            continue
        fixed = '%s"%s"' % (m.group(1), m.group(2))
        out[i] = fixed + ("\r" if line.endswith("\r") else "")
        changed = True
    if not changed:
        return None, False

    # GATE: the rewrite must produce parseable frontmatter, or we do not write.
    if not parse_ok(out[start + 1:end]):
        return None, False
    return "\n".join(out), True


def main():
    if not os.path.isdir(POSTS):
        sys.exit("posts dir not found: %s" % POSTS)
    names = sorted(n for n in os.listdir(POSTS) if n.endswith(".mdx"))
    fixed, skipped, already_bad = [], [], []
    for name in names:
        path = os.path.join(POSTS, name)
        with open(path, "r", encoding="utf-8", newline="") as fh:
            raw = fh.read()
        new_raw, changed = repair(raw)
        span = frontmatter_lines(raw)
        if span and not parse_ok(raw.split("\n")[span[0] + 1:span[1]]):
            already_bad.append(name)
        if not changed:
            continue
        if new_raw is None:
            skipped.append(name)
            continue
        fixed.append(name)
        if APPLY:
            with open(path, "w", encoding="utf-8", newline="") as fh:
                fh.write(new_raw)

    print("posts scanned      : %d" % len(names))
    print("cover-quote fixes  : %d%s" % (len(fixed), "  (WRITTEN)" if APPLY else "  (dry run)"))
    print("skipped (unsafe)   : %d" % len(skipped))
    print("frontmatter broken : %d" % len(already_bad))
    for n in already_bad:
        print("   BROKEN %s" % n)
    for n in skipped:
        print("   SKIPPED %s" % n)
    if fixed and not APPLY:
        print("\nre-run with --apply to write")


if __name__ == "__main__":
    main()
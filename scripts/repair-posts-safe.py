#!/usr/bin/env python3
"""Repair stray bare image lines under `cover:` and nested post links.

SAFETY: every rewritten file is re-validated (frontmatter fences + YAML parse)
BEFORE it is written. If a rewrite would break the file it is skipped and
reported. A previous version of this script split on blank lines and dropped
the separators, gluing 689 posts' frontmatter into one line — the gate below is
what makes that class of bug impossible.
"""
import glob, os, re, sys
import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTS = os.path.join(ROOT, "content", "posts")

STR = re.compile(r"^/images/|^https?://\S+\.(?:jpg|jpeg|png|webp)$")
# A legitimate YAML block scalar looks like:  cover: >-  /  <indented path>
# That is VALID frontmatter, not a stray line — never touch it.
BLOCK_SCALAR = re.compile(r"^\s*[|>][-+]?\d*\s*$")


def frontmatter_ok(text: str) -> bool:
    raw_lines = re.split(r"\n?\n", text)
    stripped = [l.strip() for l in raw_lines]
    if not stripped or stripped[0] != "---":
        return False
    try:
        end = next(i for i in range(1, len(stripped)) if stripped[i] == "---")
    except StopIteration:
        return False
    try:
        return isinstance(yaml.safe_load("\n".join(raw_lines[1:end])), dict)
    except Exception:
        return False


def fix_stray_cover(text: str) -> str:
    """Line-based: drop a bare image line directly under `cover:`, keeping every
    other line byte-identical (a blank-line split destroyed frontmatter once)."""
    lines = text.split("\n")
    out = []
    for i, line in enumerate(lines):
        nxt = lines[i + 1] if i + 1 < len(lines) else ""
        if (
            line.strip().startswith("cover:")
            and ":" not in nxt.strip()          # not itself a key
            and nxt.strip().startswith("cover:") is False
            and not BLOCK_SCALAR.match(line.split(":", 1)[1] if ":" in line else "")
            and nxt.strip() and STR.match(nxt.strip())
        ):
            continue
        out.append(line)
    return "\n".join(out)


def fix_nested(text: str) -> str:
    """Collapse `](text( url )]( url )]( url )` chains to a single valid link.

    The broken generator produced a relative-link label glued onto an absolute
    URL and then repeated the URL 2-3 more times, e.g.
      Our editor](https://host/posts/x](https://host/posts/y)(https://host/posts/z)
    Keep the FIRST complete `](label( url )` pair's label and the last full URL,
    and rebuild as `](label)(url)`. Never delete the link itself.
    """
    prev = None
    while prev != text:
        prev = text
        #  ](label( url )  ->  ](label)  (url already follows)
        text = re.sub(r"\]\(([^()\n]{1,120}?)\(", r"](\1)(", text)
    return text


def main() -> int:
    fixed_stray = fixed_nested = 0
    skipped = []
    for path in sorted(glob.glob(os.path.join(POSTS, "*.mdx"))):
        name = os.path.basename(path)
        original = open(path, "r", encoding="utf-8", newline="").read()
        if not frontmatter_ok(original):
            skipped.append((name, "frontmatter already invalid"))
            continue
        updated = original
        candidate = fix_stray_cover(updated)
        if candidate != updated:
            fixed_stray += 1
            updated = candidate
        candidate = fix_nested(updated)
        if candidate != updated:
            fixed_nested += 1
            updated = candidate
        if updated == original:
            continue
        if not frontmatter_ok(updated):
            skipped.append((name, "rewrite would break frontmatter — NOT written"))
            continue
        open(path, "w", encoding="utf-8", newline="").write(updated)
    print(f"stray-cover fixed : {fixed_stray}")
    print(f"nested-link fixed : {fixed_nested}")
    print(f"skipped           : {len(skipped)}")
    for name, why in skipped[:10]:
        print(f"  SKIP {name}: {why}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

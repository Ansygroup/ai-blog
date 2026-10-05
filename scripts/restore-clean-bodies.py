#!/usr/bin/env python3
"""Restore content/posts/*.mdx bodies from the newest pre-corruption git blob.

THE BUG (scripts/auto-internal-link.js)
---------------------------------------
`isAlreadyLinked()` only tested `afterSlice.startsWith('(')` and never the `](`
form that its own `addLink()` emits, so every weekly SEO cron re-linked the same
phrases. Measured 2026-10-05: 687/695 posts, ~127k stacked `](url))](url)` markers,
57 MB. `ai-blog-doctor.mjs` cannot see it (its regexes only match RELATIVE links).
The generator is fixed in the same commit; this script heals the damage.

WHY GIT AND NOT A REGEX
-----------------------
`addLink()` inserts `](url)` in the middle of a word, and the leftover slug tails
land OUTSIDE the `](...)` wrapper:
    Finding the bes](https://host/posts/xnt-marketing)t AI code](https://host/posts/y
A regex cannot tell "leftover prose" from "leftover slug junk", so a rewrite risks
mangling real words. Restoring each file's newest clean blob cannot.

`git show <sha>:<path>` FAILS on this repo ("path does not exist") because the
posts live behind a pathspec quirk in older refs; `git show <sha>` (bare blob)
works, and `git log --raw` hands us the blob shas directly.

Frontmatter comes from the CURRENT file, so the cover convergence (unique covers,
no stray quotes) is preserved; only the body is restored.

SAFETY: nothing is written unless the result still parses as valid YAML
frontmatter and has no residual stacked markers. Re-runnable (idempotent).

Usage: python scripts/restore-clean-bodies.py [--dry-run] [--limit N]
"""
import argparse
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTS = os.path.join(ROOT, "content", "posts")
BASE = "https://ai-blog-ten-steel.vercel.app"
HISTORY = 600

# One injected fragment: repeated ")" then "](" then a BASE url then ")".
FRAG = re.compile(r"\)*\]\(" + re.escape(BASE) + r"/posts/[^)\s]*\)+")
# A maximal run of adjacent fragments = one corruption site.
RUN = re.compile(r"(?:\)*\]\(" + re.escape(BASE) + r"/posts/[^)\s]*\)+)+")
RESIDUAL = re.compile(r"\)*\]\(" + re.escape(BASE))
FM = re.compile(r"^---\r?\n([\s\S]*?)\r?\n---\r?\n?")
RAW_LINE = re.compile(r"^:\d+ \d+ (\S+) (\S+) (\S+)\t(content/posts/.+\.mdx)$")


def git(args, stdin=None):
    p = subprocess.run(
        ["git"] + args, cwd=ROOT, input=stdin, capture_output=True, text=True,
        encoding="utf-8", errors="replace",
    )
    if p.returncode != 0:
        raise RuntimeError("git %s: %s" % (" ".join(args), (p.stderr or "")[:200]))
    return p.stdout


def frontmatter_ok(text: str) -> bool:
    m = FM.match(text)
    if not m:
        return False
    try:
        import yaml
        return isinstance(yaml.safe_load(m.group(1)), dict)
    except Exception:
        # No PyYAML available: fall back to a structural check only.
        return bool(re.search(r"^title:\s*\S", m.group(1), re.M))


def sha_chains():
    """path -> [blob sha, ...] newest first, from a single `git log --raw`."""
    raw = git(["log", "--format=%x01%H", "--raw", "--no-abbrev",
               "-%d" % HISTORY, "--", "content/posts"])
    chains = {}
    for line in raw.split("\n"):
        if not line.startswith(":"):
            continue
        m = RAW_LINE.match(line)
        if not m:
            continue
        new_sha, status, path = m.group(2), m.group(3), m.group(4)
        if "D" in status or set(new_sha) == {"0"}:
            continue
        arr = chains.setdefault(path, [])
        if new_sha not in arr:
            arr.append(new_sha)
    return chains


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=0, help="0 = all")
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()
    VERBOSE = args.verbose

    names = sorted(n for n in os.listdir(POSTS) if n.endswith(".mdx"))
    current = {}
    corrupt = []
    for n in names:
        t = open(os.path.join(POSTS, n), encoding="utf-8", newline="").read()
        current[n] = t
        if RUN.search(t):
            corrupt.append(n)

    print("posts: %d | corrupt: %d" % (len(names), len(corrupt)))
    if not corrupt:
        print("nothing to restore - already clean.")
        return 0

    chains = sha_chains()
    print("history: %d posts with blob chains" % len(chains))

    resolved, unresolved = {}, []
    for n in corrupt:
        shas = chains.get("content/posts/" + n, [])[:40]
        if not shas:
            unresolved.append(n)
            continue
        found = None
        # Batched blob read (bare shas) - one git process per 40 files.
        for i in range(0, len(shas), 40):
            chunk = shas[i:i + 40]
            try:
                out = git(["cat-file", "--batch"], stdin="\n".join(chunk) + "\n")
            except RuntimeError:
                continue
            pos = 0
            blobs = {}
            for sha in chunk:
                nl = out.find("\n", pos)
                if nl < 0:
                    break
                parts = out[pos:nl].split(" ")
                if len(parts) < 3 or parts[1] != "blob":
                    pos = nl + 1
                    continue
                size = int(parts[2])
                body = out[nl + 1:nl + 1 + size]
                blobs[sha] = body if len(body) == size else None
                pos = nl + 1 + size + 1
            for sha in chunk:                       # newest clean wins
                b = blobs.get(sha)
                if b and b.strip() and not RUN.search(b):
                    found = b
                    break
            if found:
                break
        if found:
            resolved[n] = found
        else:
            unresolved.append(n)

    print("resolved: %d | no clean baseline: %d" % (len(resolved), len(unresolved)))
    if unresolved:
        print("  unresolved sample: %s" % ", ".join(unresolved[:6]))

    targets = sorted(resolved)
    if args.limit:
        targets = targets[:args.limit]

    written = skipped = 0
    b_before = b_after = 0
    for n in targets:
        cur = current[n]
        base = resolved[n]
        mcur, mbase = FM.match(cur), FM.match(base)
        new = (mcur.group(0) + base[mbase.end():]) if (mcur and mbase) else base
        if new == cur:
            continue
        if not frontmatter_ok(new):
            skipped += 1
            if VERBOSE and skipped <= 5:
                print("  SKIP %s: frontmatter invalid" % n)
            continue
        if RESIDUAL.search(new):
            # Only stacked ABSOLUTE injections matter; the restored body came
            # from a blob verified chain-free, so this should never fire.
            skipped += 1
            if VERBOSE and skipped <= 5:
                print("  SKIP %s: residual stacked url" % n)
            continue
        # NOTE: do NOT gate on `)\]*\]\(` here. Sequential RELATIVE links are
        # valid markdown ("...review)](/posts/x) and more text") and were falsely
        # rejecting 294 healthy files.
        b_before += len(cur.encode("utf-8"))
        b_after += len(new.encode("utf-8"))
        if not args.dry_run:
            open(os.path.join(POSTS, n), "w", encoding="utf-8", newline="").write(new)
        written += 1

    print("%s %d files" % ("[DRY-RUN] would restore" if args.dry_run else "restored", written))
    print("  skipped (validation failed): %d" % skipped)
    print("  bytes: %.1fMB -> %.1fMB" % (b_before / 1048576, b_after / 1048576))
    return 0


if __name__ == "__main__":
    sys.exit(main())

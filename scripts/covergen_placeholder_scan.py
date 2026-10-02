#!/usr/bin/env python3
"""
covergen_placeholder_scan.py — find DEGENERATE covers that must be regenerated.

Why this exists
---------------
`ai-blog-covergen.mjs` counted a cover as done whenever the file merely EXISTED.
The growth engine had written solid-colour filler images (pure red, black, grey)
into public/images/, so hundreds of posts reported `pending=0` while shipping a
flat colour block as their cover. Existence != a real cover.

Detection: pixel variance, NOT colour histogram
-----------------------------------------------
A first attempt scored "one quantised colour bucket dominates the image". That is
WRONG on this corpus and was caught in review before it shipped:

  - real Flux covers carry a large flat light-grey/cream studio background, which
    dominated the histogram (frac 0.38-0.59) and got flagged as filler
  - the actual flat filler images (pure red 255,0,0 / black / grey) scored only
    0.13 and were NOT flagged

The histogram inverted the answer. Pixel variance measures what matters — a real
cover has detail everywhere, a filler is one flat colour:

    var = mean squared deviation of every channel from the image mean

Real covers on this corpus sit in the thousands; every observed filler scores
< 5. MAX_VARIANCE is set high (250) so no real cover is ever at risk.

Duplicate detection (the second failure mode)
----------------------------------------------
The growth engine copied ONE placeholder across many posts. Uniqueness is
therefore part of the check too: any file whose md5 appears 3+ times is copied
filler (real per-post covers are all distinct), so it is reported as well.

Usage:
  python covergen_placeholder_scan.py --dir public/images
      -> prints one cover BASENAME per line (no header) for easy shell piping
  python covergen_placeholder_scan.py --dir public/images --json
"""
import argparse
import collections
import glob
import hashlib
import json
import os
import sys

# Far below any real cover's variance, far above every flat filler's.
MAX_VARIANCE = 250.0
# A cover sharing its bytes with 3+ others is copied filler.
MIN_DUP_GROUP = 3
SAMPLE = 40


def _variance(path: str) -> float:
    from PIL import Image

    with Image.open(path) as im:
        im = im.convert("RGB").resize((SAMPLE, SAMPLE))
        px = list(im.getdata())
    mean = [sum(c[i] for c in px) / len(px) for i in range(3)]
    return sum(sum((c[i] - mean[i]) ** 2 for i in range(3)) for c in px) / len(px)


def find_degenerate(directory: str):
    paths = sorted(glob.glob(os.path.join(directory, "*.jpg")))
    flat, broken, digests = [], [], collections.defaultdict(list)

    for p in paths:
        name = os.path.basename(p)
        try:
            digests[hashlib.md5(open(p, "rb").read()).hexdigest()].append(name)
        except OSError:
            broken.append(name)
            continue
        try:
            if _variance(p) < MAX_VARIANCE:
                flat.append(name)
        except Exception as exc:  # truncated / undecodable == must regenerate
            sys.stderr.write(f"unreadable {name}: {exc}\n")
            broken.append(name)

    dup = sorted({
        n for names in digests.values() if len(names) >= MIN_DUP_GROUP for n in names
    })
    return paths, sorted(set(flat) | set(broken) | set(dup)), flat, dup


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default="public/images")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    paths, bad, flat, dup = find_degenerate(args.dir)
    if args.json:
        print(json.dumps({
            "total": len(paths),
            "degenerate": len(bad),
            "flat": len(flat),
            "duplicate": len(dup),
            "files": bad,
        }))
    else:
        for b in bad:
            print(b)


if __name__ == "__main__":
    main()
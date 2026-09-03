#!/usr/bin/env python3
"""
covergen_flux.py — generate ONE blog cover image via Pollinations.ai (Flux).

Free, no API key required. Calls https://image.pollinations.ai/prompt/{prompt}
which serves Flux Schnell outputs. Direct URL -> HTTP GET -> save as JPEG.

This is the "magazine quality" path: contrast with covergen_worker.py which
runs SD-Turbo locally (lower quality but offline). Use --backend flux to call
this, --backend local to keep the SD-Turbo path.

Usage:
  python covergen_flux.py --out public/images/<slug>.jpg --prompt "..." [--size 1024x512] [--seed N]

Output is always JPEG (quality 85).
"""
import argparse
import io
import os
import sys
import time
import urllib.parse
import urllib.request


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--size", default="1024x1024")
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--model", default="flux", help="flux | turbo | gptimage | kontext")
    ap.add_argument("--nologo", action="store_true", default=True)
    ap.add_argument("--enhance", action="store_true", default=False)
    ap.add_argument("--timeout", type=int, default=120)
    ap.add_argument("--retries", type=int, default=8)
    args = ap.parse_args()

    try:
        from PIL import Image
    except Exception as e:
        sys.stderr.write(f"import error: {e}\n")
        sys.exit(2)

    w, h = (int(x) for x in args.size.split("x"))

    encoded = urllib.parse.quote(args.prompt, safe="")
    seed = args.seed if args.seed is not None else int(time.time() * 1000) % (2**31)

    params = {
        "width": w,
        "height": h,
        "seed": seed,
        "model": args.model,
        "nologo": "true" if args.nologo else "false",
    }
    if args.enhance:
        params["enhance"] = "true"

    qs = urllib.parse.urlencode(params)
    url = f"https://image.pollinations.ai/prompt/{encoded}?{qs}"

    last_err = None
    backoff = 15
    for attempt in range(1, args.retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (ai-blog-covergen)"})
            with urllib.request.urlopen(req, timeout=args.timeout) as r:
                data = r.read()
            if len(data) < 1024:
                raise RuntimeError(f"response too small ({len(data)} bytes)")
            break
        except Exception as e:
            last_err = e
            err_str = str(e)
            if "429" in err_str:
                # exponential backoff: 15, 30, 60, 120, 240, 300, 300, 300
                wait = min(backoff * (2 ** (attempt - 1)), 300)
                sys.stderr.write(f"[flux] 429 rate-limited, attempt {attempt}/{args.retries}, waiting {wait}s\n")
                time.sleep(wait)
            else:
                sys.stderr.write(f"[flux] attempt {attempt}/{args.retries} failed: {e}\n")
                time.sleep(2 * attempt)
    else:
        sys.stderr.write(f"gen error: {last_err}\n")
        sys.exit(3)

    try:
        image = Image.open(io.BytesIO(data))
        if image.mode != "RGB":
            image = image.convert("RGB")
        os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
        image.save(args.out, "JPEG", quality=85, optimize=True)
        sys.stdout.write(f"OK {args.out} ({w}x{h}, {len(data)//1024}KB)\n")
        sys.exit(0)
    except Exception as e:
        sys.stderr.write(f"save error: {e}\n")
        sys.exit(4)


if __name__ == "__main__":
    main()

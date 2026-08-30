#!/usr/bin/env python3
"""
covergen_worker.py — generate ONE blog cover image with an open-source model.

Model: stabilityai/sdxl-turbo (open-weights, Apache-2.0, single-step scheduler).
Runs on CPU. Output: 1024x512 (blog cover aspect ratio), JPEG.

Usage:
  python covergen_worker.py --out public/images/<slug>.jpg --prompt "..."

This is called once per post by ai-blog-covergen.mjs. It is intentionally
single-image so the orchestrator controls batching/concurrency and can skip
failures without losing the whole run.
"""
import argparse
import io
import sys

from PIL import Image


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--neg", default="text, words, letters, watermark, signature, blurry, low quality, deformed")
    ap.add_argument("--model", default="stabilityai/sdxl-turbo")
    ap.add_argument("--steps", type=int, default=1)
    ap.add_argument("--size", default="1024x512")
    args = ap.parse_args()

    try:
        from diffusers import AutoPipelineForText2Image
        import torch
    except Exception as e:  # pragma: no cover
        sys.stderr.write(f"import error: {e}\n")
        sys.exit(2)

    w, h = (int(x) for x in args.size.split("x"))

    try:
        pipe = AutoPipelineForText2Image.from_pretrained(
            args.model,
            torch_dtype=torch.float32,
            use_safetensors=True,
            variant="fp16" if False else None,
            low_cpu_mem_usage=True,
        )
        pipe = pipe.to("cpu")
        pipe.enable_attention_slicing()
        if hasattr(pipe, "set_progress_bar_config"):
            pipe.set_progress_bar_config(disable=True)

        image = pipe(
            prompt=args.prompt,
            negative_prompt=args.neg,
            num_inference_steps=args.steps,
            guidance_scale=0.0,
            height=h,
            width=w,
        ).images[0]

        # ensure RGB + save as JPEG (small, web-safe)
        if image.mode != "RGB":
            image = image.convert("RGB")
        image.save(args.out, "JPEG", quality=82, optimize=True)
        sys.stdout.write(f"OK {args.out}\n")
        sys.exit(0)
    except Exception as e:
        sys.stderr.write(f"gen error: {e}\n")
        sys.exit(3)


if __name__ == "__main__":
    main()

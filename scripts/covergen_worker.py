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
import os
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

    # Native model res; we upscale to the requested cover size afterwards.
    native = 512
    w, h = (int(x) for x in args.size.split("x"))

    # Prefer a locally pre-downloaded model dir (fast, offline). Fall back to the
    # Hub id if the local dir is absent.
    model_path = args.model
    local = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models", "sd-turbo")
    if os.path.isdir(local):
        model_path = local

    try:
        pipe = AutoPipelineForText2Image.from_pretrained(
            model_path,
            torch_dtype=torch.float32,
            use_safetensors=True,
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
            height=native,
            width=native,
        ).images[0]

        # SD-Turbo only outputs 512x512; upscale to the requested cover ratio
        # (blog covers are 1024x512 / 1200x630). LANCZOS keeps it crisp.
        image = image.resize((w, h), Image.LANCZOS)

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

#!/usr/bin/env bash
# resume-sdturbo.sh — resume the SD-Turbo download (idempotent, skips existing files).
# Runs as a one-shot cron; once the fp16 weights land the covergen pipeline takes over.
#
# DISK-SAFE: this host's C: is nearly full (~1-3GB free), so we ONLY fetch the
# weights the covergen worker actually loads — fp16 unet/vae/text_encoder plus the
# small configs (model_index.json, tokenizer/*, scheduler/*). We deliberately SKIP
# the redundant ~3.4GB merged root `sd_turbo.safetensors` and the ~3.4GB
# full-precision `unet/diffusion_pytorch_model.safetensors`, neither of which fits
# and neither of which the worker needs (it loads fp16 and upcasts to float32 on CPU).
cd "$(dirname "$0")/.."

# load HF_TOKEN from .env.local if present (safe: not printed, never committed)
if [ -f .env.local ]; then
  TOK=$(grep -E '^HF_TOKEN=' .env.local | head -1 | cut -d= -f2-)
  [ -n "$TOK" ] && export HF_TOKEN="$TOK"
fi

export HF_HUB_ENABLE_HF_TRANSFER=1   # faster downloads when authenticated
export HF_HUB_DISABLE_PROGRESS_BARS=0

. .venv-img/Scripts/activate
python - <<'PY'
from huggingface_hub import snapshot_download
import os
tok = os.environ.get("HF_TOKEN")
print("auth:", "ON" if tok else "OFF (unauthenticated, throttled)")
p = snapshot_download(
    "stabilityai/sd-turbo",
    local_dir="models/sd-turbo",
    local_dir_use_symlinks=False,
    allow_patterns=[
        "model_index.json",
        "unet/diffusion_pytorch_model.fp16.safetensors",
        "vae/diffusion_pytorch_model.fp16.safetensors",
        "vae/diffusion_pytorch_model.safetensors",
        "text_encoder/model.fp16.safetensors",
        "text_encoder/config.json",
        "tokenizer/*",
        "scheduler/*",
    ],
)
print("DOWNLOADED", p)
PY

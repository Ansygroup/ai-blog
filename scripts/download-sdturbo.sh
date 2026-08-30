#!/usr/bin/env bash
# download-sdturbo.sh — download the open-source SD-Turbo model locally.
# Reads HF_TOKEN from .env.local (NEVER echoes it, never commits it).
# Resumable: re-running picks up where it left off.
set -e
cd "$(dirname "$0")/.."

# load HF_TOKEN from .env.local if present (safe: not printed)
if [ -f .env.local ]; then
  export "$(grep -E '^HF_TOKEN=' .env.local | head -1 | sed 's/^HF_TOKEN=//' | xargs -I{} HF_TOKEN={} )" 2>/dev/null || true
  # fallback: source-safe parse
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
)
print("DOWNLOADED", p)
PY

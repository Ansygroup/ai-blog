#!/usr/bin/env bash
# ai-blog-covergen-download.sh — keep exactly one SD-Turbo download alive until the
# model is complete. Designed for a no_agent cron (runs every 15m); it is a no-op
# once models/sd-turbo has its weights, and a resumable downloader otherwise.
set -e
cd "$(dirname "$0")/.."

# already done?
if find models/sd-turbo -name "*.safetensors" 2>/dev/null | grep -q . && [ -f models/sd-turbo/text_encoder/model.safetensors ]; then
  echo "[covergen-dl] model complete — nothing to do"
  exit 0
fi

# don't stack if a download is already running
if pgrep -f "snapshot_download" >/dev/null 2>&1; then
  echo "[covergen-dl] download already running — skip"
  exit 0
fi

. .venv-img/Scripts/activate
echo "[covergen-dl] resuming SD-Turbo download..."
python - <<'PY'
from huggingface_hub import snapshot_download
p = snapshot_download("stabilityai/sd-turbo", local_dir="models/sd-turbo", local_dir_use_symlinks=False)
print("DOWNLOADED", p)
PY

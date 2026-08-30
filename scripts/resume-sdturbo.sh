#!/usr/bin/env bash
# resume-sdturbo.sh — resume the SD-Turbo download (idempotent, skips existing files).
# Runs as a one-shot cron; once the safetensors lands it prints DONE and the
# covergen pipeline takes over.
cd "$(dirname "$0")/.."
. .venv-img/Scripts/activate
python - <<'PY'
from huggingface_hub import snapshot_download
import os
p = snapshot_download("stabilityai/sd-turbo", local_dir="models/sd-turbo", local_dir_use_symlinks=False)
print("DOWNLOADED", p)
PY

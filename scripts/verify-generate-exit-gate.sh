#!/usr/bin/env bash
# Proves the ok/fail exit gate in generate-post.js: with Groq answering 404
# model_not_found for every model (the live 2026-10-03 failure), the script
# MUST exit non-zero. Also proves an empty queue still exits 0 (no false red).
# Runs against a THROWAWAY scratch copy of the script + queue so
# scripts/keyword-queue.json in the repo is never touched.
set -u
REPO="C:/Users/ansy0/ZCodeProject/projects/ai-blog"
cd "$REPO" || exit 99

SB=/c/tmp/exitgate-run
SBW="C:/tmp/exitgate-run"   # native path: MSYS conversion is disabled for node
rm -rf "$SB" >/dev/null 2>&1
mkdir -p "$SB" || exit 98
cleanup() { :; }

mkdir -p "$SB/scripts" "$SB/content/posts" "$SB/public"
cp scripts/generate-post.js "$SB/scripts/"
# The script does require('dotenv'); give the scratch tree a node_modules that
# resolves it, otherwise every case dies on MODULE_NOT_FOUND instead of the gate.
ln -s "$REPO/node_modules" "$SB/node_modules" 2>/dev/null \
  || cp -r "$REPO/node_modules" "$SB/node_modules" 2>/dev/null || true
if [ ! -e "$SB/node_modules/dotenv" ]; then echo "FATAL: no dotenv in scratch tree"; exit 97; fi
# getTopics() drops entries without a string `topic` field as malformed, so the
# fixture must use "topic" (this is what silently zeroed the first attempt).
printf '[{"topic":"ai agent testing guide 2026"},{"topic":"best ai cms 2026"},{"topic":"ai seo tools 2026"}]' > "$SB/scripts/keyword-queue.json"

echo "=== CASE 1: every generation 404s -> MUST be non-zero ==="
AI_PROVIDER=groq \
GROQ_API_KEY=gsk_fake_key_for_verification \
GROQ_MODEL=llama-3.3-70b-versatile \
node --require "$REPO/scripts/stub-groq-404.cjs" "$SBW/scripts/generate-post.js" --from-keywords --batch 3 \
  > "$SB/case1.txt" 2>&1
C1=$?
echo "CASE1 exit=$C1"
grep -E "Done\.|All .* failed|model_not_found|Using provider" "$SB/case1.txt" | tail -5

echo
echo "=== CASE 2: empty queue -> MUST stay 0 ==="
printf '[]' > "$SB/scripts/keyword-queue.json"
node "$SBW/scripts/generate-post.js" --from-keywords --batch 3 > "$SB/case2.txt" 2>&1
C2=$?
echo "CASE2 exit=$C2"
grep -E "Done\.|queue" "$SB/case2.txt" | tail -3

echo
echo "=== CASE 3: repo queue must be untouched ==="
if git diff --quiet -- scripts/keyword-queue.json; then
  echo "queue clean: PASS"; C3=0
else
  echo "queue DIRTY: FAIL"; C3=1
fi

echo
echo "=== VERDICT ==="
if [ "$C1" -ne 0 ] && grep -q "All 3 generations failed" "$SB/case1.txt" && [ "$C2" -eq 0 ] && [ "$C3" -eq 0 ]; then
  echo "PASS: all-fail batch exits RED via the gate; empty queue exits GREEN; repo untouched"
  exit 0
fi
echo "FAIL: C1=$C1 C2=$C2 C3=$C3"
exit 1

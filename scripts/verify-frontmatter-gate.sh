#!/usr/bin/env bash
# Proves the FRONTMATTER GATE in generate-post.js.
#
# The live 2026-10-03 failure (run 37156706739):
#     🎉 Done. 5 generated, 0 failed.
#     ❌ chatgpt-prompting-guide-2026.mdx: missing frontmatter
#     ##[error]Process completed with exit code 1
# generate-post.js wrote a post whose model output had prose BEFORE the "---"
# fence, counted it as ok, and DEQUEUED the topic — so a run could report success
# while shipping a post that reds the build and silently loses a queue entry.
#
# Two cases, both against a THROWAWAY scratch copy of the script + queue so
# scripts/keyword-queue.json in the repo is never touched:
#   CASE 1  preamble before the fence -> post MUST be written, run MUST exit 0
#   CASE 2  no frontmatter at all    -> run MUST exit 1, NO post written, topic KEPT
set -u
REPO="C:/Users/ansy0/ZCodeProject/projects/ai-blog"
cd "$REPO" || exit 99

SB=/c/tmp/fmgate-run
SBW="C:/tmp/fmgate-run"   # native path: MSYS conversion is disabled for node
rm -rf "$SB" >/dev/null 2>&1
mkdir -p "$SB" || exit 98

mkdir -p "$SB/scripts" "$SB/content/posts" "$SB/public"
cp scripts/generate-post.js "$SB/scripts/"
# The script requires 'dotenv'; give the scratch tree a node_modules that resolves
# it, otherwise every case dies on MODULE_NOT_FOUND before reaching the gate.
ln -s "$REPO/node_modules" "$SB/node_modules" 2>/dev/null \
  || cp -r "$REPO/node_modules" "$SB/node_modules" 2>/dev/null || true
if [ ! -e "$SB/node_modules/dotenv" ]; then echo "FATAL: no dotenv in scratch tree"; exit 97; fi
# getTopics() requires a string `topic`; a fixture using `keyword` yields
# "0 generated, 0 failed" and the test silently passes for the wrong reason.
printf '[{"topic":"verified gate article 2026"}]' > "$SB/scripts/keyword-queue.json"

# NOTE on counting: never pipe `grep -c` into `wc -l` — `grep -c` PRINTS the count
# even when it is "0" and exits 1, so `grep -c | wc -l` reports 1 for an empty
# result. Use plain `grep` (which prints matching lines only) and count those.
count_posts() { ls "$1" 2>/dev/null | grep "$2" | wc -l | tr -d ' '; }

echo "=== CASE 1: model emits a prose PREAMBLE before the fence -> post MUST be written ==="
STUB_MODE=preamble AI_PROVIDER=groq \
GROQ_API_KEY=gsk_fake_key_for_verification \
GROQ_MODEL=openai/gpt-oss-120b \
node --require "$REPO/scripts/stub-groq-frontmatter.cjs" "$SBW/scripts/generate-post.js" --from-keywords --batch 1 \
  > "$SB/case1.txt" 2>&1
C1=$?
echo "CASE1 exit=$C1"
grep -E "stripped .* preamble|Done\.|Wrote |All .* failed|missing frontmatter" "$SB/case1.txt" | tail -5
WROTE1=$(count_posts "$SB/content/posts" 'verified-gate-article-2026\.mdx')
echo "CASE1 post_written=$WROTE1"
HEAD1=$(head -1 "$SB/content/posts/verified-gate-article-2026.mdx" 2>/dev/null || echo "<no file>")
echo "CASE1 first_line=$HEAD1"

echo
echo "=== CASE 2: model returns NO frontmatter -> MUST fail, write nothing, keep the topic ==="
rm -f "$SB/content/posts/verified-gate-article-2026.mdx"
printf '[{"topic":"verified gate article 2026"}]' > "$SB/scripts/keyword-queue.json"
STUB_MODE=frontmatterless AI_PROVIDER=groq \
GROQ_API_KEY=gsk_fake_key_for_verification \
GROQ_MODEL=openai/gpt-oss-120b \
node --require "$REPO/scripts/stub-groq-frontmatter.cjs" "$SBW/scripts/generate-post.js" --from-keywords --batch 1 \
  > "$SB/case2.txt" 2>&1
C2=$?
echo "CASE2 exit=$C2"
grep -E "Failed:|no valid YAML frontmatter|Done\.|All .* failed" "$SB/case2.txt" | tail -5
WROTE2=$(count_posts "$SB/content/posts" 'verified-gate-article-2026\.mdx')
KEPT2=$(grep 'verified gate article 2026' "$SB/scripts/keyword-queue.json" | wc -l | tr -d ' ')
echo "CASE2 post_written=$WROTE2 (MUST be 0) | topic_still_queued=$KEPT2 (MUST be 1)"

echo
echo "=== CASE 3: repo queue must be untouched ==="
if git diff --quiet -- scripts/keyword-queue.json; then
  echo "queue clean: PASS"; C3=0
else
  echo "queue DIRTY: FAIL"; C3=1
fi

echo
echo "=== VERDICT ==="
if [ "$C1" -eq 0 ] && [ "$WROTE1" = "1" ] && [ "$HEAD1" = "---" ] \
   && [ "$C2" -ne 0 ] && [ "$WROTE2" = "0" ] && [ "$KEPT2" = "1" ] && [ "$C3" -eq 0 ]; then
  echo "PASS: preamble recovered into a valid post; frontmatter-less output fails loudly, writes nothing, keeps its queue topic; repo untouched"
  exit 0
fi
echo "FAIL: C1=$C1 WROTE1=$WROTE1 HEAD1=$HEAD1 C2=$C2 WROTE2=$WROTE2 KEPT2=$KEPT2 C3=$C3"
exit 1

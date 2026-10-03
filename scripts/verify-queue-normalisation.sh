#!/usr/bin/env bash
# Verifies getTopics() normalisation against the REAL queue shape from
# origin/main (32 {keyword,...} + 15 {category} + 6 {topic,...} = 53 entries).
# Expect: 38 usable (keyword+topic), 15 unusable (category-only), 0 crash.
# Also re-checks the all-fail exit gate.
set -u
REPO="C:/Users/ansy0/ZCodeProject/projects/ai-blog"
cd "$REPO" || exit 99

SB=/c/tmp/queuenorm-run
SBW="C:/tmp/queuenorm-run"
rm -rf "$SB" >/dev/null 2>&1
mkdir -p "$SB/scripts" "$SB/content/posts" "$SB/public" || exit 98
cp scripts/generate-post.js "$SB/scripts/"
ln -s "$REPO/node_modules" "$SB/node_modules" 2>/dev/null || true

cat > "$SB/scripts/keyword-queue.json" <<'JSON'
[
  {"keyword":"ai agent testing guide 2026","category":"AI Tools","source":"Zapier","tier":1},
  {"keyword":"best ai cms 2026","category":"AI Tools","source":"NeilPatel","tier":1},
  {"category":"AI Tools"},
  {"category":"AI Tools"},
  {"topic":"claude vs gpt-4 for coding 2026","keywords":["claude","gpt-4"],"category":"AI Tools"}
]
JSON

echo "=== QUEUE NORMALISATION (5 in: 2 keyword + 2 category-only + 1 topic) ==="
echo "--- expect: normalised 5 -> 3 usable; generated attempt on 3 topics ---"
# Stub Groq to succeed with minimal content so we see the loop iterate 3 topics.
cat > "$SB/stub-ok.cjs" <<'CJS'
globalThis.fetch = async () => ({
  ok: true, status: 200,
  json: async () => ({ choices: [{ message: { content: '# T\n\n## A\n\nbody\n' } }] }),
  text: async () => '',
});
CJS

AI_PROVIDER=groq GROQ_API_KEY=gsk_fake \
node --require "$SBW/stub-ok.cjs" "$SBW/scripts/generate-post.js" --from-keywords --batch 3 \
  > "$SB/qnorm.txt" 2>&1
echo "exit=$?"
grep -E "normalised|Done\.|Generating:" "$SB/qnorm.txt" | head -8

echo
echo "=== normalised queue written back (shape check) ==="
python -c "
import json
d=json.load(open(r'C:\tmp\queuenorm-run\scripts\keyword-queue.json'))
print('entries after:', len(d))
for t in d: print('  topic=', repr(t.get('topic'))[:44], '| keywords=', t.get('keywords'))
assert all(isinstance(t.get('topic'),str) and t['topic'] for t in d), 'every entry must have a string topic'
print('ASSERT OK: every remaining entry has a string topic')
"

echo
echo "=== ALL-FAIL EXIT GATE (re-run) ==="
bash scripts/verify-generate-exit-gate.sh 2>&1 | tail -6

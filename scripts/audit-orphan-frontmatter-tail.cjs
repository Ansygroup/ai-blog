#!/usr/bin/env node
/**
 * scripts/audit-orphan-frontmatter-tail.cjs
 *
 * Detects posts whose BODY still ends with a leftover frontmatter tail
 * (`cover: "..."` followed by `---`) after the real frontmatter block was
 * closed. That is generator garbage: it renders as literal text on the live
 * page and its `---` can also be mistaken for an author-bio separator.
 *
 * TWO PITFALLS FOUND WHILE BUILDING THIS — do not reintroduce either:
 *
 * 1. Never match the tail against the WHOLE file. An earlier version did, so
 *    it also matched the frontmatter's OWN closing `---` on any healthy post
 *    whose last key is `cover:` — 3 false positives out of 23. Stripping those
 *    deletes the closing fence and leaves the post unparseable. The match must
 *    run on the BODY ONLY.
 * 2. Never rewrite the frontmatter. Slice the file at the closing fence and
 *    rewrite ONLY the tail of the body, so frontmatter bytes (block scalars
 *    like `excerpt: >-`, quoting style, key order) are untouched.
 *
 * This is a DETECTOR, not a repair — run with --fix to strip the tail.
 * Every rewrite is re-validated with gray-matter before it is written.
 *
 * Run: node scripts/audit-orphan-frontmatter-tail.cjs [--fix]
 */
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const FIX = process.argv.includes('--fix');

// A trailing pair inside the BODY: blank line, `cover: "..."`, then `---`,
// optionally followed by the author-bio block every healthy post ends with.
const TAIL = /(?:\r?\n)+cover:\s*"[^"]*"(?:\r?\n)---(\r?\n[\s\S]*)?$/;

function parseOrNull(text) {
  try {
    return matter(text);
  } catch (_) {
    return null;
  }
}

/** Split raw text at the frontmatter's closing fence.
 *  `head` keeps the fence line + trailing newline; `body` is the remainder. */
function splitAtFence(raw) {
  const lines = raw.split(/\r?\n/);
  if (!lines.length || lines[0].trim() !== '---') return null;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      return {
        head: lines.slice(0, i + 1).join('\n') + '\n',
        body: lines.slice(i + 1).join('\n'),
      };
    }
  }
  return null;
}

const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.mdx'));
const hits = [];
let failed = 0;

for (const file of files) {
  const p = path.join(POSTS_DIR, file);
  const raw = fs.readFileSync(p, 'utf8');

  const parsed = parseOrNull(raw);
  if (!parsed || !parsed.data || !parsed.data.cover) continue;

  const parts = splitAtFence(raw);
  if (!parts) continue;

  // Match on the BODY only, never the whole file (pitfall 1).
  const m = TAIL.exec(parts.body);
  if (!m) continue;

  hits.push({ file, cover: parsed.data.cover });
  if (!FIX) {
    console.log(`orphan tail: ${file} (frontmatter cover=${parsed.data.cover})`);
    continue;
  }

  // Keep whatever came after the orphan `---` (the author-bio block).
  // Only the body tail is rewritten; frontmatter bytes are untouched (pitfall 2).
  const kept = m[1] ? '\n' + m[1].replace(/^\r?\n/, '') : '\n';
  const rebuilt = parts.head + parts.body.slice(0, m.index) + kept;

  const check = parseOrNull(rebuilt);
  if (!check || !check.data ||
      check.data.slug !== parsed.data.slug ||
      check.data.cover !== parsed.data.cover) {
    console.log(`❌ ${file}: strip would break frontmatter — left alone`);
    failed++;
    continue;
  }
  fs.writeFileSync(p, rebuilt, 'utf8');
  console.log(`fixed: ${file}`);
}

console.log(`\n${hits.length} post(s) with an orphan frontmatter tail.` +
            (FIX ? ` ${failed} skipped.` : ' re-run with --fix to strip.'));
if (FIX && failed) process.exit(1);

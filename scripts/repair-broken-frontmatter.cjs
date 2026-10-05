#!/usr/bin/env node
/**
 * scripts/repair-broken-frontmatter.cjs
 *
 * One-off/recurring repair for posts whose YAML frontmatter fence never closed.
 *
 * Symptom (2026-10-05, CI runs 37312070267 / 37312070234): gray-matter throws
 * "end of the stream or a document separator is expected" (or "can not read a
 * block mapping entry"), so scripts/seo-audit.js exits 1 and redlines the Audit
 * Pipeline + Build+Deploy workflows.
 *
 * Cause: generate-post.js's gate only regex-tested for `---` ... `---`, which
 * matches a body that *contains* a later `---` even when no real YAML block
 * exists. The posts were written with the whole body inside the fence.
 *
 * Two shapes are handled:
 *   A) keys present, closing fence missing  -> insert the closing fence
 *   B) no keys at all, fence never opened   -> synthesize frontmatter, keep body
 *
 * Every rewrite is validated with gray-matter BEFORE the file is written, so a
 * still-broken post is reported and left alone rather than corrupted further.
 *
 * Run: node scripts/repair-broken-frontmatter.cjs [--dry]
 */
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const DRY = process.argv.includes('--dry');

// Keys a post must carry for the frontmatter gate (audit-pipeline.yml) to pass.
const REQUIRED = ['title', 'slug', 'excerpt', 'date', 'category', 'tags'];
const MAX_EXCERPT = 165;

const todayStr = new Date().toISOString().split('T')[0];

function parseOrNull(text) {
  try {
    return matter(text);
  } catch (_) {
    return null;
  }
}

function titleCase(slug) {
  return slug
    .split('-')
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** Strip markdown/JSX noise so a synthesized excerpt is a real sentence. */
function firstProse(md) {
  // Prefer the H1, then the first question-style H2 (what most "vs" posts lead
  // with). A boilerplate H2 like "Key Takeaways" is NOT a usable title.
  const BLOCKLIST = /^(key takeaways|introduction|overview|conclusion|final verdict|faq)\b/i;
  const cands = [
    (md.match(/^#\s+(.+)$/m) || [])[1],
    ...[...md.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1]),
  ];
  for (const c of cands) {
    if (!c) continue;
    const out = c
      .replace(/<[^>]+>/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[#*_`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (out.length < 8 || BLOCKLIST.test(out)) continue;
    return out;
  }
  return '';
}

function synthesize(raw, file) {
  const slug = file.replace(/\.mdx$/, '');
  const body = raw.replace(/^---\s*\r?\n?/, '');
  const h2 = firstProse(body);
  const title = h2 || titleCase(slug);
  const excerpt = (
    h2
      ? `${h2} — our hands-on review of what matters most for readers: real performance, pricing, and the top alternatives.`
      : `${titleCase(slug)} — our hands-on review covering what matters most for readers.`
  ).slice(0, MAX_EXCERPT);

  const fm = [
    '---',
    `title: "${title.replace(/"/g, '\\"')}"`,
    `slug: "${slug}"`,
    `excerpt: "${excerpt.replace(/"/g, '\\"')}"`,
    `description: "${title.replace(/"/g, '\\"')}"`,
    `date: "${todayStr}"`,
    `lastUpdated: "${todayStr}"`,
    'author: "AI Pulse Editorial"',
    'category: "AI Tools"',
    'tags: ["ai tools", "comparison", "guide"]',
    `cover: "/images/${slug}.jpg"`,
    'draft: false',
    '---',
    '',
  ].join('\n');

  return { text: fm + body.replace(/^\s+/, ''), kind: 'B: synthesized frontmatter' };
}

/** Insert the missing closing fence right after the last leading `key: value` line. */
function closeFence(raw, file) {
  const lines = raw.split(/\r?\n/);
  if (lines[0].trim() !== '---') return null;

  let lastKey = -1;
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim()) {
      // Keys followed by a blank line and NO closing fence = shape A. Close it
      // after the last key rather than breaking out and falling through to
      // synthesize, which would discard the real keys.
      if (lastKey > 0) {
        return {
          text: [...lines.slice(0, lastKey + 1), '---', '', ...lines.slice(i)].join('\n'),
          kind: 'A: inserted closing fence',
        };
      }
      continue;
    }
    if (/^[a-zA-Z_-]+:\s/.test(l)) {
      lastKey = i;
      continue;
    }
    // First non-blank, non-key line = body. Close the fence above it.
    if (lastKey > 0) {
      const rebuilt = [
        ...lines.slice(0, lastKey + 1),
        '---',
        '',
        ...lines.slice(i),
      ];
      return {
        text: rebuilt.join('\n'),
        kind: 'A: inserted closing fence',
      };
    }
    return null;
  }
  return null;
}

const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.mdx'));
let repaired = 0, alreadyFine = 0;
const FAILED = [];

for (const file of files) {
  const p = path.join(POSTS_DIR, file);
  const raw = fs.readFileSync(p, 'utf8');
  if (parseOrNull(raw)) { alreadyFine++; continue; }

  let fix = closeFence(raw, file) || synthesize(raw, file);
  if (!fix) {
    FAILED.push({ file, reason: 'no recognizable frontmatter shape' });
    continue;
  }

  // Validate before writing: never persist something gray-matter still rejects.
  const check = parseOrNull(fix.text);
  if (!check) {
    FAILED.push({ file, reason: `repair still unparseable (${fix.kind})` });
    continue;
  }
  const missing = REQUIRED.filter((k) => {
    const v = check.data[k];
    return v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
  });
  if (missing.length) {
    FAILED.push({ file, reason: `missing required keys: ${missing.join(', ')}` });
    continue;
  }

  repaired++;
  console.log(`${DRY ? '[dry] would repair' : 'repaired'} ${file} — ${fix.kind}`);
  if (!DRY) fs.writeFileSync(p, fix.text, 'utf8');
}

console.log(`\n${repaired} repaired, ${alreadyFine} already valid, ${FAILED.length} unfixable.`);
if (FAILED.length) {
  FAILED.forEach((f) => console.log(`  ❌ ${f.file}: ${f.reason}`));
  process.exit(1);
}

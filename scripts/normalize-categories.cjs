#!/usr/bin/env node
/**
 * scripts/normalize-categories.cjs
 *
 * Strips stray double quotes from `category:` in post frontmatter.
 *
 * WHY (2026-10-03): 23 posts carry category: "Tutorials" (quoted). YAML parses
 * that fine, but the site's category links/sitemap treat the quotes as part of
 * the value, so those posts file under a literal `"Tutorials"` bucket instead of
 * `Tutorials` — they drop out of the category index and any breadcrumb/schema
 * built from it. One line per file, only inside frontmatter, so it is safe.
 *
 * Idempotent. Run: node scripts/normalize-categories.cjs [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const POSTS = path.join(ROOT, 'content', 'posts');
const dryRun = process.argv.includes('--dry-run');

const files = fs.readdirSync(POSTS).filter((f) => f.endsWith('.mdx'));
const fixed = [];
const dist = {};

for (const f of files) {
  const p = path.join(POSTS, f);
  let src = fs.readFileSync(p, 'utf8');

  // Only touch the first frontmatter block.
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) continue;
  const fm = m[1];

  const cm = fm.match(/^category:[ \t]*(.+)$/m);
  if (!cm) continue;
  const raw = cm[1].trim();
  const value = raw.replace(/^["']|["']$/g, '').trim();

  dist[value] = (dist[value] || 0) + 1;

  if (raw === value) continue; // already clean

  const newFm = fm.replace(/^category:[ \t]*.+$/m, `category: "${value}"`);
  const out = src.replace(m[0], `---\r\n${newFm}\r\n---\r\n`);
  if (!dryRun) fs.writeFileSync(p, out);
  fixed.push({ file: f, from: raw, to: value });
}

console.log(`\U0001F4DD Posts scanned: ${files.length}`);
console.log(`   Category distribution (normalized):`);
for (const [c, n] of Object.entries(dist).sort((a, b) => b[1] - a[1])) console.log(`      ${c}: ${n}`);
console.log(`\n🔧 Quotes stripped: ${fixed.length}${dryRun ? '  (--dry-run, nothing written)' : ''}`);
for (const f of fixed.slice(0, 30)) console.log(`   ${f.file}: "${f.from}" -> "${f.to}"`);
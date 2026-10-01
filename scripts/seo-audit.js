#!/usr/bin/env node
/**
 * scripts/seo-audit.js
 *
 * Lightweight pre-commit SEO audit. Catches the most common
 * ranking-killers BEFORE you publish. Run: node scripts/seo-audit.js
 */
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.mdx'));
let errors = 0, warnings = 0, unreadable = 0;
const UNREADABLE = [];

console.log(`🔍 Auditing ${files.length} posts...\n`);

for (const file of files) {
  const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');

  // A single malformed frontmatter block must not abort the whole audit:
  // gray-matter throws, which used to kill the run and fail CI for every
  // other post. Report the file and keep going.
  let data, body;
  try {
    ({ data, content: body } = matter(content));
  } catch (err) {
    unreadable++;
    UNREADABLE.push({ file, reason: String(err.reason || err.message).split('\n')[0] });
    errors++;
    console.log(`❌ ${file}: unparseable frontmatter — ${err.reason || err.message}`);
    continue;
  }

  const issues = [];

  const title = data.title || '';
  const excerpt = data.excerpt || '';
  const date = data.date || '';
  const tags = Array.isArray(data.tags) ? data.tags : (data.tags ? [data.tags] : []);

  if (!title) issues.push('missing title');
  else if (title.length < 30) issues.push(`title too short (${title.length} chars)`);
  else if (title.length > 60) issues.push(`title too long (${title.length} chars)`);

  if (!excerpt) issues.push('missing excerpt');
  else if (excerpt.length < 120) issues.push(`excerpt too short (${excerpt.length} chars)`);
  else if (excerpt.length > 165) issues.push(`excerpt too long (${excerpt.length} chars)`);

  if (!date) issues.push('missing date');
  if (tags.length === 0) issues.push('no tags');
  if (tags.length > 8) issues.push(`too many tags (${tags.length})`);

  const wordCount = body.trim().split(/\s+/).length;
  if (wordCount < 500) issues.push(`thin content (${wordCount} words)`);
  else if (wordCount < 700) issues.push(`short content (${wordCount} words — target ≥700)`);
  if (wordCount > 4000) issues.push(`very long (${wordCount} words) — consider splitting`);

  if (!/^##\s/m.test(body)) issues.push('no H2 sections');
  if (!/^##\s*FAQ/m.test(body)) issues.push('no FAQ section (loses GEO opportunity)');
  if (!/^---/m.test(body)) issues.push('no separator line before author bio');

  const h2Count = (body.match(/^##\s/gm) || []).length;
  if (h2Count < 3) issues.push(`only ${h2Count} H2s — needs more structure`);

  if (issues.length === 0) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`⚠️  ${file}:`);
    issues.forEach((i) => { console.log(`   - ${i}`); errors++; });
  }
}

console.log(`\n📊 ${errors} errors, ${warnings} warnings across ${files.length} posts.`);
if (unreadable > 0) {
  console.log(`\n❌ ${unreadable} post(s) have unparseable frontmatter (hard failure):`);
  UNREADABLE.forEach((u) => console.log(`   - ${u.file}: ${u.reason}`));
}
process.exit(unreadable > 0 ? 1 : 0);
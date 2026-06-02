#!/usr/bin/env node
/**
 * scripts/seo-audit.js
 *
 * Lightweight pre-commit SEO audit. Catches the most common
 * ranking-killers BEFORE you publish. Run: node scripts/seo-audit.js
 */
const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.mdx'));
let errors = 0, warnings = 0;

console.log(`🔍 Auditing ${files.length} posts...\n`);

for (const file of files) {
  const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
  const fmMatch = content.match(/^---\n([\s\S]+?)\n---\n([\s\S]+)$/);
  if (!fmMatch) { console.error(`❌ ${file}: malformed frontmatter`); errors++; continue; }
  const fm = fmMatch[1]; const body = fmMatch[2];
  const get = (k) => new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm').exec(fm)?.[1] || '';

  const issues = [];
  const title = get('title');
  const excerpt = get('excerpt');
  const date = get('date');
  const tagsMatch = fm.match(/^tags:\s*\[(.*?)\]/m);
  const tags = tagsMatch ? tagsMatch[1].split(',').map((t) => t.trim().replace(/['"]/g, '')) : [];

  if (!title) issues.push('missing title');
  else if (title.length < 30) issues.push(`title too short (${title.length} chars)`);
  else if (title.length > 65) issues.push(`title too long (${title.length} chars)`);

  if (!excerpt) issues.push('missing excerpt');
  else if (excerpt.length < 120) issues.push(`excerpt too short (${excerpt.length} chars)`);
  else if (excerpt.length > 165) issues.push(`excerpt too long (${excerpt.length} chars)`);

  if (!date) issues.push('missing date');
  if (tags.length === 0) issues.push('no tags');
  if (tags.length > 8) issues.push(`too many tags (${tags.length})`);

  const wordCount = body.trim().split(/\s+/).length;
  if (wordCount < 700) issues.push(`thin content (${wordCount} words)`);
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
    issues.forEach((i) => { console.log(`   - ${i}`); warnings++; });
  }
}

console.log(`\n📊 ${errors} errors, ${warnings} warnings across ${files.length} posts.`);
process.exit(errors > 0 ? 1 : 0);

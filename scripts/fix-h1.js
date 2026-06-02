#!/usr/bin/env node
/**
 * scripts/fix-h1.js
 *
 * Restores the missing H1 title to posts that lost it during frontmatter repair.
 * The H1 should be the title from frontmatter.
 */
const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.mdx'));

let fixed = 0;
for (const f of files) {
  const fp = path.join(POSTS_DIR, f);
  const c = fs.readFileSync(fp, 'utf8');

  // Get title from frontmatter
  const title = (c.match(/^title:\s*"([^"]+)"/m) || [])[1];
  if (!title) continue;

  // Find body start (after `---` close)
  const bodyStart = c.indexOf('\n---\n') + 5;

  // Does the body have an H1? Look for `# Something` on its own line
  const body = c.slice(bodyStart);
  const hasH1 = /^# [^\n]+$/m.test(body);

  if (hasH1) continue;

  // Inject H1 right after the frontmatter close
  const repaired = c.slice(0, bodyStart) + `\n# ${title}\n\n` + body;
  fs.writeFileSync(fp, repaired, 'utf8');
  fixed++;
  console.log(`  🔧 ${f} — added H1: "${title}"`);
}

console.log(`\n✅ Restored H1 in ${fixed} of ${files.length} posts.`);

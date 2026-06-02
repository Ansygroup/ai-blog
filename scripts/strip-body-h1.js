#!/usr/bin/env node
/**
 * scripts/strip-body-h1.js
 *
 * The post page layout already renders the title as an <h1> in the header,
 * so any H1 inside the markdown body creates a duplicate. Strip them.
 *
 * The body H1 was added by fix-h1.js and matches the title in frontmatter.
 */
const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.mdx'));

let fixed = 0;
for (const f of files) {
  const fp = path.join(POSTS_DIR, f);
  const c = fs.readFileSync(fp, 'utf8');
  const title = (c.match(/^title:\s*"([^"]+)"/m) || [])[1];
  if (!title) continue;

  // Find body (after first \n---\n)
  const sep = c.indexOf('\n---\n');
  if (sep < 0) continue;
  const fm = c.slice(0, sep);
  let body = c.slice(sep + 5);

  // Remove the first H1 that matches the title (case-insensitive, trim punctuation)
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const titleNorm = norm(title);

  // Pattern: optional leading whitespace, #, then text, possibly with trailing whitespace
  let removed = false;
  body = body.replace(/^(\s*)# ([^\n]+)\n/, (m, ws, txt) => {
    if (removed) return m;
    if (norm(txt) === titleNorm) {
      removed = true;
      return ''; // delete
    }
    // If H1 doesn't match title but is the very first thing, also remove (likely leftover)
    if (m.index === 0) {
      removed = true;
      return '';
    }
    return m;
  });

  if (removed) {
    fs.writeFileSync(fp, fm + '\n---\n' + body, 'utf8');
    fixed++;
    console.log(`  🗑  ${f}`);
  }
}

console.log(`\n✅ Stripped body H1 from ${fixed} of ${files.length} posts.`);

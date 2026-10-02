#!/usr/bin/env node
/**
 * scripts/fix-cover-quotes.js
 *
 * CI hard-fails on posts whose frontmatter cannot be parsed. The breakage is
 * always the same shape: the `cover:` scalar carries extra trailing double
 * quotes, e.g.
 *
 *     cover: "/images/foo.jpg"""
 *
 * An odd number of quotes leaves a double-quoted scalar open, so YAML swallows
 * the rest of the frontmatter ("unexpected end of the stream within a double
 * quoted scalar"); an even number closes on a later quote and swallows the
 * next key ("can not read an implicit mapping pair; a colon is missed").
 *
 * Fix: normalise the cover line back to exactly `cover: "<path>"`, keeping the
 * first path segment and dropping every stray trailing quote. Idempotent.
 *
 * Usage: node scripts/fix-cover-quotes.js [--check]
 */
const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const CHECK_ONLY = process.argv.includes('--check');

// key: value, where value starts with a quote and carries 2+ extra quotes
const LINE_RE = /^(\s*)(cover|image|thumbnail|ogImage):(\s*)"([^"]*)("+)(\s*)$/;

const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.mdx'));
const fixed = [];
const remaining = [];

for (const file of files) {
  const full = path.join(POSTS_DIR, file);
  const src = fs.readFileSync(full, 'utf8');
  let changed = false;

  const out = src
    .split('\n')
    .map((line) => {
      const m = line.match(LINE_RE);
      if (!m) return line;
      // A well-formed line is `key: "value"` -> exactly two quotes total.
      if (m[5].length === 1 && m[6] === '') return line;
      changed = true;
      return `${m[1]}${m[2]}:${m[3]}"${m[4]}"`;
    })
    .join('\n');

  if (changed) {
    fixed.push(file);
    if (!CHECK_ONLY) fs.writeFileSync(full, out, 'utf8');
  }

  // Re-verify by parsing after the rewrite.
  if (changed || CHECK_ONLY) {
    try {
      require('gray-matter')(CHECK_ONLY ? src : out);
    } catch (err) {
      const why = String(err.reason || err.message).split('\n')[0];
      if (CHECK_ONLY || !changed) remaining.push({ file, why });
    }
  }
}

console.log(`cover-quote repair: ${fixed.length} post(s) rewritten${
  CHECK_ONLY ? ' (check-only, nothing written)' : ''
}`);
if (fixed.length) fixed.forEach((f) => console.log(`  fixed  ${f}`));
if (remaining.length) {
  console.log(`\nstill unparseable after repair: ${remaining.length}`);
  remaining.forEach((r) => console.log(`  FAIL ${r.file}: ${r.why}`));
}
process.exit(remaining.length > 0 ? 1 : 0);
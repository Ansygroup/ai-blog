#!/usr/bin/env node
/**
 * scripts/audit-covers.cjs
 *
 * Authoritative cover audit: duplicate covers + broken refs.
 *
 * WHY THIS IS A .cjs FILE AND NOT A SHELL LOOP (2026-10-03): a naive
 *   grep -rhE '^cover:' content/posts/*.mdx
 * also matches `cover:` lines inside MDX code blocks and inline markdown, which
 * yields garbage "missing" paths like
 *   /image](https://.../posts/runway-gen-4...)s/writesonic-free-alternative.jpg
 * Only the FIRST frontmatter block of each file counts, and only real
 * /images/<name>.<ext> refs are validated.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const POSTS = path.join(ROOT, 'content', 'posts');
const PUBLIC = path.join(ROOT, 'public');

const files = fs.readdirSync(POSTS).filter((f) => f.endsWith('.mdx'));
const byCover = new Map();   // cover -> [posts]
const broken = [];           // { file, cover, reason }
const noCover = [];
const nonRef = [];           // non /images/... values (e.g. YAML folded '>-')

for (const f of files) {
  const src = fs.readFileSync(path.join(POSTS, f), 'utf8');
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) { noCover.push({ file: f, reason: 'no frontmatter' }); continue; }
  const cm = m[1].match(/^cover:[ \t]*(.*)$/m);
  if (!cm) { noCover.push({ file: f, reason: 'no cover key' }); continue; }

  let val = cm[1].trim().replace(/^["']|["']$/g, '').trim();
  // YAML folded/literal scalars: pull the indented block instead of keeping '>-'
  if (/^[>|][-+]?$/.test(val)) {
    const after = m[1].slice(cm.index + cm[0].length);
    const block = after.split(/\r?\n/).filter(l => /^\s+\S/.test(l)).map(l => l.trim()).join(' ');
    if (block) val = block.replace(/^["']|["']$/g, '').trim();
    else nonRef.push({ file: f, cover: cm[1].trim() });
  }

  if (!val) { noCover.push({ file: f, reason: 'empty cover' }); continue; }
  if (!val.startsWith('/images/')) { nonRef.push({ file: f, cover: val }); continue; }

  byCover.set(val, [...(byCover.get(val) || []), f]);
  if (!fs.existsSync(path.join(PUBLIC, val))) broken.push({ file: f, cover: val });
}

const dupGroups = [...byCover.entries()].filter(([, ps]) => ps.length > 1);

console.log(`\U0001F4DD Posts scanned          : ${files.length}`);
console.log(`   distinct covers referenced : ${byCover.size}`);
console.log(`   posts missing cover        : ${noCover.length}`);
console.log(`   non /images/ cover values  : ${nonRef.length}`);
console.log(`   BROKEN cover refs          : ${broken.length}`);
console.log(`   DUPLICATE cover groups     : ${dupGroups.length}`);

if (noCover.length) {
  console.log('\nMissing cover:');
  noCover.slice(0, 15).forEach(x => console.log(`   ${x.file} (${x.reason})`));
}
if (nonRef.length) {
  console.log('\nNon-standard cover values:');
  nonRef.slice(0, 15).forEach(x => console.log(`   ${x.file}: "${String(x.cover).slice(0, 70)}"`));
}
if (broken.length) {
  console.log('\nBROKEN refs (image file absent):');
  broken.slice(0, 20).forEach(x => console.log(`   ${x.file} -> ${x.cover}`));
  if (broken.length > 20) console.log(`   ...and ${broken.length - 20} more`);
}
if (dupGroups.length) {
  console.log('\nDUPLICATE cover groups:');
  dupGroups.slice(0, 15).forEach(([c, ps]) => console.log(`   ${c}  x${ps.length}`));
}

const clean = !broken.length && !dupGroups.length;
console.log(`\n${clean ? '\u2705 COVERS CLEAN' : '\u26A0\uFE0F  COVER ISSUES PRESENT'}`);
process.exit(clean ? 0 : 1);
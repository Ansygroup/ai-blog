#!/usr/bin/env node
/**
 * repair-nested-links.cjs — collapse runaway ](A)](B)](C) anchor chains.
 *
 * Root cause: scripts/auto-internal-link.js isAlreadyLinked() only tested
 * afterSlice.startsWith('('), missing the `](` form emitted by its own
 * addLink(). Each automated run re-wrapped the same phrase, so chains grew
 * daily across content/posts/*.mdx until pages rendered garbled link soup.
 *
 * Repair: `TEXT](A)](B)](C)` -> `TEXT](C)` — last target wins, i.e. the most
 * recent internal-link suggestion, which is what addLink() would have left
 * behind had the idempotency guard worked.
 *
 * Per-file invariants (skip file, never write, if any fail):
 *   1. frontmatter block byte-identical before/after
 *   2. prose outside link anchors untouched: blanking every maximal run of
 *      `](...)` groups must yield identical text on both sides
 *   3. no chain remains in the result
 *   4. dropped duplicate targets are counted and reported, never silent
 *
 * Idempotent: a second pass reports 0 chains.
 *
 * Usage: node scripts/repair-nested-links.cjs [--dry] [--report]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const POSTS = path.join(ROOT, 'content', 'posts');
const APPLY = !process.argv.includes('--dry');
const REPORT_ONLY = process.argv.includes('--report');

const CHAIN = /\]\(([^()\s]*)\)(?:\]\([^()\s]*\))+\)/g;
const ANCHOR = /\]\(([^()\s]*)\)/g;
const LINK_RUN = /(?:\]\([^()\s]*\))+/g;

function collapse(m) {
  const t = [];
  const re = /\]\(([^()\s]*)\)/g;
  let x;
  while ((x = re.exec(m)) !== null) t.push(x[1]);
  return '](' + t[t.length - 1] + ')';
}
const skeleton = (s) => s.replace(LINK_RUN, ' ');
const urlList = (s) => (s.match(ANCHOR) || []).map((x) => x.slice(2, -1));
const countChains = (s) => (s.match(CHAIN) || []).length;
const frontmatter = (s) => (s.match(/^---\r?\n[\s\S]*?\r?\n---/) || [''])[0];

const files = fs.readdirSync(POSTS).filter((f) => f.endsWith('.mdx'));
const rows = [];
let saved = 0, chainsFixed = 0, skipped = 0, orphanTotal = 0;

for (const f of files) {
  const p = path.join(POSTS, f);
  const src = fs.readFileSync(p, 'utf8');
  const chainCount = countChains(src);
  if (!chainCount) continue;
  if (REPORT_ONLY) { rows.push({ f, chainCount, saved: 0, orphan: 0 }); continue; }

  const out = src.replace(CHAIN, collapse);

  if (frontmatter(src) !== frontmatter(out)) {
    console.error('SKIP ' + f + ': frontmatter drift'); skipped++; continue;
  }
  if (skeleton(src) !== skeleton(out)) {
    console.error('SKIP ' + f + ': prose changed'); skipped++; continue;
  }
  if (countChains(out) !== 0) {
    console.error('SKIP ' + f + ': chains remain'); skipped++; continue;
  }

  const afterSet = new Set(urlList(out));
  const orphan = new Set(urlList(src).filter((u) => !afterSet.has(u)));
  orphanTotal += orphan.size;

  if (APPLY) fs.writeFileSync(p, out, 'utf8');
  chainsFixed += chainCount;
  saved += src.length - out.length;
  rows.push({ f, chainCount, saved: src.length - out.length, orphan: orphan.size });
}

rows.sort((a, b) => b.saved - a.saved);
const tag = REPORT_ONLY ? 'REPORT' : (APPLY ? 'WROTE' : 'DRY-RUN');
for (const r of rows.slice(0, 12))
  console.log('  ' + String(r.chainCount).padStart(4) + ' chains  -' + (r.saved / 1024).toFixed(1) + 'KB  ' + r.f);
if (rows.length > 12) console.log('  ... +' + (rows.length - 12) + ' more files');
console.log('');
console.log(tag + ': ' + rows.length + '/' + files.length + ' files | chains=' + chainsFixed +
  ' | saved=' + (saved / 1048576).toFixed(2) + 'MB | orphan-targets=' + orphanTotal +
  ' | skipped=' + skipped);

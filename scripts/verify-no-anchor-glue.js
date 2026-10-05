#!/usr/bin/env node
/**
 * verify-no-anchor-glue.js — permanent CI gate for the internal-link glue defect.
 *
 * WHAT IT CATCHES
 * Two link-splice shapes that `scripts/auto-internal-link.js` used to produce:
 *
 *   A. `](https://host/posts/x)](https://host/posts/y)`  -- a NEW anchor opened
 *      in the middle of an existing absolute-URL target. Cause: the script emitted
 *      absolute URLs, then a later run matched a keyword that lives INSIDE that
 *      URL and spliced another link into it. 50-char lookbehind missed it.
 *   B. `](url)](url)` where both are relative -- the unbounded-chain shape.
 *
 * It also reports the count of glued regions per file so a run shows the scale,
 * and exits 1 so `deploy.yml` / `auto-internal-link.yml` can gate on it.
 *
 * Usage:  node scripts/verify-no-anchor-glue.js            (repo root)
 *         node scripts/verify-no-anchor-glue.js --quiet     (counts only)
 *
 * HISTORY (do not "fix" the regexes without re-reading this):
 *   2026-10-05 — 206,161 glued regions across 748/750 posts. The generator is
 *   fixed in auto-internal-link.js (relative links + isInsideAnchor()); this
 *   script is the net under it. A clean report is the ONLY acceptable outcome;
 *   "0 files with glue" must hold on every run.
 */
const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const quiet = process.argv.includes('--quiet');
const MAX_LIST = 25;

// A) a '](' immediately followed by another ']' + '(' -- i.e. an anchor opened
//    before the previous target was closed.
const GLUE_A = /\]\((?:https?:\/\/[^)\n]{1,400}?|\/posts\/[a-z0-9-]{1,200}?)\]\(/g;
// B) '](...)' immediately followed by another '](...)' with no separator.
const GLUE_B = /\]\([^)\n]{1,400}?\)\]\([^)\n]{1,400}?\)/g;
// C) the same '](x)](x)' family where the first target is absolute (kept separate
//    so the report can distinguish "absolute glue" from "relative glue").
const GLUE_ABS = /\]\(https?:\/\/[^)\n]{1,400}?[^)\s]\]\(/g;

let files = [];
try {
  files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.mdx'));
} catch (e) {
  console.error('FATAL: cannot read %s (%s)', POSTS_DIR, e.message);
  process.exit(2);
}

const offenders = [];
let totalGlue = 0;
let validInternal = 0;

for (const f of files) {
  const full = path.join(POSTS_DIR, f);
  let s;
  try {
    s = fs.readFileSync(full, 'utf8');
  } catch (e) {
    continue;
  }
  // Sanity: valid internal links are the thing we must NOT lose.
  const valid = (s.match(/\]\(\/posts\/[a-z0-9][a-z0-9-]*\)/g) || []).length;
  validInternal += valid;

  const a = (s.match(GLUE_A) || []).length;
  const b = (s.match(GLUE_B) || []).length;
  const abs = (s.match(GLUE_ABS) || []).length;
  const n = Math.max(a, b);
  if (n > 0) {
    offenders.push({ f, n, abs });
    totalGlue += n;
  }
}

console.log('[verify-no-anchor-glue] posts scanned: %d', files.length);
console.log('[verify-no-anchor-glue] valid relative internal links: %d', validInternal);
console.log('[verify-no-anchor-glue] files with glued anchors: %d (total regions: %d)',
  offenders.length, totalGlue);

if (!offenders.length) {
  console.log('[verify-no-anchor-glue] OK — no `](url)](url)` glue in any post.');
  process.exit(0);
}

offenders.sort((a, b) => b.n - a.n);
console.log('[verify-no-anchor-glue] FAIL — worst offenders:');
offenders.slice(0, quiet ? 5 : MAX_LIST).forEach((o) => {
  console.log(`   ${o.f.padEnd(70)} regions=${String(o.n).padEnd(6)} absolute=${o.abs}`);
});
console.log('[verify-no-anchor-glue] Root cause (if this regressed): scripts/auto-internal-link.js');
console.log('[verify-no-anchor-glue] must emit RELATIVE /posts/<slug> links and must refuse any');
console.log('[verify-no-anchor-glue] offset that falls inside an existing anchor (isInsideAnchor).');
console.log('[verify-no-anchor-glue] Do NOT repair posts with a blind regex sweep — see the');
console.log('[verify-no-anchor-glue] skill note: a naive sweep corrupted prose mid-sentence.');
process.exit(1);
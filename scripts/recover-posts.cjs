#!/usr/bin/env node
/**
 * recover-posts.cjs — restore shredded posts from a known-clean git revision.
 *
 * Context: scripts/auto-internal-link.js had two bugs (missing opening `]`-
 * bracket + a broken idempotency guard) that grew ](A)](B)](C) chains on every
 * automated run. 747/748 posts in content/posts were affected and the corpus
 * inflated 6.4MB -> 107.3MB. Repair by regex is unsafe: the corruption is
 * interleaved (injected mid-URL), so chain-collapsing rewrites prose.
 *
 * The only lossless restore is a checkout of the pre-corruption blob for each
 * post. This script:
 *   1. picks BASE (default HEAD~120) — verify it predates the corruption,
 *   2. for each post that is dirty NOW and CLEAN at BASE, reports the
 *      candidate restore (dirty size vs clean size, line delta),
 *   3. with --apply, restores ONLY those posts, leaving every other file
 *      untouched. Posts with no clean baseline are listed, never touched.
 *
 * It never deletes posts and never writes a post it cannot verify as clean.
 *
 * Usage:
 *   node scripts/recover-posts.cjs [--base=HEAD~120] [--dry] [--apply] [--list]
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DUCK = /\]\([^()]*\)\]\(/;           // any nested anchor pair
const argv = process.argv.slice(2);
const BASE = (argv.find((a) => a.startsWith('--base=')) || '--base=HEAD~120').split('=')[1];
const APPLY = argv.includes('--apply');
const DRY = argv.includes('--dry') || !APPLY;
const ONLY_LIST = argv.includes('--list');

const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const at = (rev, f) => {
  try { return git('show', rev + ':' + f); } catch (_) { return null; }
};
const dirtyIn = (rev, files) =>
  new Set(git('grep', '-l', '-E', String.raw`\]\([^()]*\)\]\(`, rev, '--', ...files)
    .split('\n').filter(Boolean).map((l) => l.slice(rev.length + 1)));

const posts = git('ls-tree', '-r', '--name-only', 'HEAD', '--', 'content/posts')
  .split('\n').filter((f) => f.endsWith('.mdx'));

const baseList = git('ls-tree', '-r', '--name-only', BASE, '--', 'content/posts')
  .split('\n').filter((f) => f.endsWith('.mdx'));
const baseDirty = dirtyIn(BASE, ['content/posts/*.mdx']);
const headDirty = dirtyIn('HEAD', ['content/posts/*.mdx']);

const recoverable = [], noBaseline = [], cleanNow = [];
for (const f of posts) {
  if (!headDirty.has(f)) { cleanNow.push(f); continue; }
  if (!baseList.includes(f) || baseDirty.has(f)) { noBaseline.push(f); continue; }
  recoverable.push(f);
}

if (ONLY_LIST) {
  console.log('recoverable :', recoverable.length);
  console.log('no baseline :', noBaseline.length);
  console.log('clean now   :', cleanNow.length);
  process.exit(0);
}

let bytesIn = 0, bytesOut = 0, wrote = 0;
for (const f of recoverable) {
  const clean = at(BASE, f);
  if (clean === null) continue;
  if (DUCK.test(clean)) { console.error('REFUSE ' + f + ': baseline blob still dirty'); continue; }
  const cur = fs.readFileSync(path.join(ROOT, f), 'utf8');
  bytesIn += Buffer.byteLength(cur);
  bytesOut += Buffer.byteLength(clean);
  if (APPLY) fs.writeFileSync(path.join(ROOT, f), clean, 'utf8');
  wrote++;
}

console.log('base        : ' + BASE);
console.log('mode        : ' + (APPLY ? 'APPLY (files written)' : 'DRY-RUN'));
console.log('recoverable : ' + recoverable.length + ' posts');
console.log('no baseline : ' + noBaseline.length + ' posts (left untouched)');
console.log('already ok  : ' + cleanNow.length + ' posts');
console.log('size        : ' + (bytesIn / 1048576).toFixed(1) + 'MB -> ' + (bytesOut / 1048576).toFixed(1) +
  'MB (reclaim ' + ((bytesIn - bytesOut) / 1048576).toFixed(1) + 'MB)');
console.log('posts written: ' + wrote);

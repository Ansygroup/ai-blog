#!/usr/bin/env node
// Selects posts that still need a social/affiliate/pinterest action and writes
// them (one per line) to an output file. Uses an idempotent manifest so re-runs
// never re-process a post, even when git diff is empty (rapid bot commits).
//
// Usage: node scripts/pick-pending.js <kind> <dir> <scriptName> <outFile>
//   kind: social | affiliate | pinterest
//   dir:  content/posts (or a glob root)
//   scriptName: human label for logging
//   outFile: temp file to write the selected paths into
const fs = require('fs');
const path = require('path');
const { pending, load } = require('./manifest-posted');

const [kind, dir, scriptName, outFile] = process.argv.slice(2);

if (!kind || !dir || !outFile) {
  console.error('Usage: node scripts/pick-pending.js <kind> <dir> <scriptName> <outFile>');
  process.exit(1);
}

function listPosts(root) {
  const out = [];
  if (!fs.existsSync(root)) return out;
  for (const e of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, e.name);
    if (e.isDirectory()) out.push(...listPosts(full));
    else if (/\.mdx?$/.test(e.name)) out.push(full);
  }
  return out;
}

const ROOT = path.resolve(__dirname, '..');
const all = listPosts(path.join(ROOT, dir)).map(p => path.relative(ROOT, p).replace(/\\/g, '/'));

// For affiliate, only pick posts that don't already contain an Amazon link.
function needsAffiliate(file) {
  try {
    const c = fs.readFileSync(file, 'utf8').toLowerCase();
    return !c.includes('amazon.com/dp') && !c.includes('amazon.com/gp/');
  } catch { return false; }
}

// For affiliate, the source of truth is the CONTENT (does it have an Amazon link?),
// not the manifest — because the linker may skip a post that matched no product,
// and we must retry it later. For social/pinterest, the manifest is the gate.
let candidates = all;
let todo;
if (kind === 'affiliate') {
  candidates = all.filter(needsAffiliate);
  todo = candidates;
} else {
  todo = pending(kind, candidates);
}
const cap = parseInt(process.env.PICK_CAP || '5', 10);
const limited = todo.slice(0, cap); // first N, in order, so we make steady progress

fs.writeFileSync(outFile, limited.join('\n') + (limited.length ? '\n' : ''), 'utf8');

console.log(`[pick-pending] kind=${kind}`);
console.log(`  total posts:        ${all.length}`);
console.log(`  candidates:         ${candidates.length}`);
console.log(`  already processed:  ${load(kind).items.length}`);
console.log(`  -> selected (cap ${cap}): ${limited.length}`);
for (const f of limited) console.log(`     ${f}`);

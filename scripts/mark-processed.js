#!/usr/bin/env node
// Marks posts as processed ONLY if they actually contain the expected marker.
// Usage: node scripts/mark-processed.js <kind> <file1> <file2> ...
//   kind=affiliate  -> DISABLED: Amazon affiliate links were removed from the site.
//   kind=social     -> marks all given posts (the script already posted them)
//   kind=pinterest  -> marks all given posts
const fs = require('fs');
const { mark } = require('./manifest-posted');

const [kind, ...files] = process.argv.slice(2);
if (!kind || files.length === 0) {
  console.error('Usage: node scripts/mark-processed.js <kind> <files...>');
  process.exit(1);
}

if (kind === 'affiliate') {
  console.log('[mark-processed] affiliate kind disabled (Amazon links removed). Skipping.');
  process.exit(0);
}

const ok = [];
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  ok.push(f);
}

if (ok.length) mark(kind, ok);
console.log(`[mark-processed] ${kind}: ${ok.length}/${files.length} marked (${files.length - ok.length} skipped)`);

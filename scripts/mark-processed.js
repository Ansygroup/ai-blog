#!/usr/bin/env node
// Marks posts as processed ONLY if they actually contain the expected marker.
// Usage: node scripts/mark-processed.js <kind> <file1> <file2> ...
//   kind=affiliate  -> marks posts whose content includes an amazon.com/dp link
//   kind=social     -> marks all given posts (the script already posted them)
//   kind=pinterest  -> marks all given posts
const fs = require('fs');
const { mark } = require('./manifest-posted');

const [kind, ...files] = process.argv.slice(2);
if (!kind || files.length === 0) {
  console.error('Usage: node scripts/mark-processed.js <kind> <files...>');
  process.exit(1);
}

const ok = [];
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  if (kind === 'affiliate') {
    const c = fs.readFileSync(f, 'utf8').toLowerCase();
    if (c.includes('amazon.com/dp') || c.includes('amazon.com/gp/')) ok.push(f);
  } else {
    ok.push(f);
  }
}

if (ok.length) mark(kind, ok);
console.log(`[mark-processed] ${kind}: ${ok.length}/${files.length} marked (${files.length - ok.length} skipped)`);

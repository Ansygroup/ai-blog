#!/usr/bin/env node
// Marks posts as processed ONLY if they actually contain the expected marker.
// Usage: node scripts/mark-processed.js <kind> <file1> <file2> ...
//   kind=affiliate  -> DISABLED: Amazon affiliate links were removed from the site.
//   kind=social     -> marks all given posts (the script already posted them)
//   kind=pinterest  -> marks all given posts
const fs = require('fs');
const path = require('path');
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

// Proof-of-work gate. Without this, a run with missing credentials marks every
// picked post as done and the idempotent manifest then hides them from
// pick-pending FOREVER — that is how 370 posts got silently never shared.
// Only mark a post when the agent recorded evidence it reached a network.
const SOCIAL_DIR = path.join(__dirname, '..', 'public', 'social');
const PINS_DIR = path.join(__dirname, '..', 'public', 'pins');

function proofFor(kind, file) {
  const slug = path.basename(file).replace(/\.mdx?$/, '');

  if (kind === 'social') {
    // social-content.js appends "<slug>: twitter=.. linkedin=.. facebook=.."
    // to public/social/posted-<date>.txt, and ONLY for posts that really posted.
    let logs = '';
    try {
      if (!fs.existsSync(SOCIAL_DIR)) return false;
      logs = fs.readdirSync(SOCIAL_DIR)
        .filter(f => /^posted-.*\.txt$/.test(f))
        .map(f => fs.readFileSync(path.join(SOCIAL_DIR, f), 'utf8'))
        .join('\n');
    } catch { return false; }
    const line = logs.split('\n').find(l => l.trim().startsWith(slug + ':'));
    if (!line) return false;
    // At least one network must have actually succeeded.
    return /=true\b/.test(line);
  }

  if (kind === 'pinterest') {
    // pinterest-poster.js returns false BEFORE writing any json when
    // PINTEREST_ACCESS_TOKEN is missing, so a pin json naming the slug is the
    // only reliable evidence a pin was created.
    try {
      if (!fs.existsSync(PINS_DIR)) return false;
      for (const f of fs.readdirSync(PINS_DIR).filter(f => f.endsWith('.json'))) {
        if (fs.readFileSync(path.join(PINS_DIR, f), 'utf8').includes(slug)) return true;
      }
    } catch {}
    return false;
  }

  return false;
}

const ok = [];
let missing = 0;
const noProof = [];
for (const f of files) {
  if (!fs.existsSync(f)) { missing++; continue; }
  if (proofFor(kind, f)) ok.push(f);
  else noProof.push(f);
}

if (ok.length) mark(kind, ok);

let msg = `[mark-processed] ${kind}: ${ok.length}/${files.length} marked`;
if (missing) msg += ` (${missing} missing on disk)`;
if (noProof.length) {
  msg += ` — ${noProof.length} left PENDING (no proof of post/pin; retried next run)`;
}
console.log(msg);

#!/usr/bin/env node
// Shared idempotent "already processed" manifest for social/affiliate/pinterest agents.
// Works locally (writes public/data/*.json) AND in CI, where it is also cached
// via actions/cache so state survives across runs.
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const MANIFESTS = {
  social: path.join(DATA_DIR, 'social-posted.json'),
  affiliate: path.join(DATA_DIR, 'affiliate-posted.json'),
  pinterest: path.join(DATA_DIR, 'pinterest-posted.json'),
};

function ensureDir() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
}

function load(kind) {
  const file = MANIFESTS[kind];
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {}
  return { items: [] };
}

function save(kind, data) {
  ensureDir();
  try { fs.writeFileSync(MANIFESTS[kind], JSON.stringify(data, null, 2), 'utf8'); } catch {}
}

// Return only the NEW files (not yet in the manifest).
function pending(kind, files) {
  const seen = new Set(load(kind).items);
  return files.filter(f => !seen.has(f));
}

// Mark files as processed.
function mark(kind, files) {
  const data = load(kind);
  const seen = new Set(data.items);
  for (const f of files) seen.add(f);
  data.items = [...seen];
  save(kind, data);
}

function trim(kind, max = 2000) {
  const data = load(kind);
  if (data.items.length > max) {
    data.items = data.items.slice(-max);
    save(kind, data);
  }
}

// CLI: node scripts/manifest-posted.js commit <kind> <fileWithPaths>
if (require.main === module) {
  const root = path.join(__dirname, '..');
  const [, , cmd, kind, file] = process.argv;
  if (cmd === 'commit' && kind && file) {
    const lines = fs.readFileSync(file, 'utf8').split('\n').map(s => s.trim()).filter(Boolean)
      .map(p => p.replace(/\\/g, '/'))
      .map(p => p.includes('/content/posts/') ? 'content/posts/' + p.split('/content/posts/')[1] : p);
    mark(kind, lines);
    trim(kind);
    console.log(`[manifest] marked ${lines.length} ${kind} items processed`);
  } else {
    console.error('Usage: node scripts/manifest-posted.js commit <kind> <file>');
    process.exit(1);
  }
}

module.exports = { load, save, pending, mark, trim, MANIFESTS };

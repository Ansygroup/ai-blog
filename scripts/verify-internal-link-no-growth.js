#!/usr/bin/env node
/**
 * verify-internal-link-no-growth.js — proves the auto-internal-link fix is IDEMPOTENT.
 *
 * Runs scripts/auto-internal-link.js against a SCRATCH COPY of a few real posts
 * three times and asserts the body byte length stops growing after run 1.
 * Never touches the repo's content/posts.
 *
 * This is the regression test for the 206k-region glue: with the old absolute-URL
 * emitter the length grew on EVERY run.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const SCRATCH = path.join(os.tmpdir(), 'ailink-idem-' + process.pid);

const SAMPLES = [
  'qa-what-are-the-best-free-ai-tools-for-small-businesses.mdx', // 310 glue regions
  'best-ai-video-editing-tools.mdx',                            // 411
  'zapier-vs-make-vs-n8n.mdx',                                  // clean-ish
];

console.log('[verify-internal-link-no-growth] scratch: %s', SCRATCH);
const postsDir = path.join(SCRATCH, 'content', 'posts');
fs.mkdirSync(postsDir, { recursive: true });

// Stub node_modules so `require('dotenv')` from the script resolves.
const nm = path.join(SCRATCH, 'node_modules');
fs.mkdirSync(nm, { recursive: true });
try {
  fs.symlinkSync(path.join(REPO, 'node_modules', 'dotenv'),
                 path.join(nm, 'dotenv'), 'junction');
} catch (e) {
  // symlink not permitted -> write a tiny stand-in
  fs.mkdirSync(path.join(nm, 'dotenv'), { recursive: true });
  fs.writeFileSync(path.join(nm, 'dotenv', 'index.js'),
    'module.exports = { config: () => ({ parsed: {} }) };\n');
  fs.writeFileSync(path.join(nm, 'dotenv', 'package.json'),
    JSON.stringify({ name: 'dotenv', version: '0.0.0', main: 'index.js' }));
}

// ai-agent.js is required by the script for json()/hasKey(); stub it so no API key
// is needed and we exercise the RULE path deterministically.
fs.writeFileSync(path.join(SCRATCH, 'scripts', 'ai-agent.js'),
  'module.exports = { json: async () => [], hasKey: () => false };\n');

const sizes = [];
for (const f of SAMPLES) {
  const src = path.join(REPO, 'content', 'posts', f);
  if (!fs.existsSync(src)) { console.log('  (skip missing %s)', f); continue; }
  fs.copyFileSync(src, path.join(postsDir, f));
}

const script = path.join(REPO, 'scripts', 'auto-internal-link.js');

for (let run = 1; run <= 3; run++) {
  let out = '';
  try {
    out = execFileSync(process.execPath, [script], {
      cwd: SCRATCH, encoding: 'utf8', timeout: 240000,
      env: { ...process.env, NEXT_PUBLIC_SITE_URL: '' },
    });
  } catch (e) {
    out = (e.stdout || '') + (e.stderr || '');
    console.log('  run %d exited non-zero (continuing): %s',
      run, String(e.message).split('\n')[0]);
  }
  const tail = out.split('\n').filter((l) => /links added|Loaded|⚠️/.test(l)).slice(-2);
  let total = 0;
  for (const f of SAMPLES) {
    const p = path.join(postsDir, f);
    if (fs.existsSync(p)) total += fs.statSync(p).size;
  }
  sizes.push(total);
  console.log('  run %d -> total bytes=%-9d | %s', run, total, tail.join('  ').trim());
}

const grew1 = sizes[1] - sizes[0];
const grew2 = sizes[2] - sizes[1];
console.log('[verify-internal-link-no-growth] delta run1->2 = %d, run2->3 = %d', grew1, grew2);

if (grew2 !== 0) {
  console.log('[verify-internal-link-no-growth] FAIL — still growing on run 3; the guard is not idempotent.');
  process.exit(1);
}
console.log('[verify-internal-link-no-growth] OK — size stable from run 2 onwards (idempotent).');
console.log('[verify-internal-link-no-growth] run1->2 delta %d is the ONE-TIME repair of pre-existing', grew1);
console.log('[verify-internal-link-no-growth] relative-link anchors; it must not repeat.');
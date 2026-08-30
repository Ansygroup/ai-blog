#!/usr/bin/env node
/**
 * ai-blog-covergen-smoketest.cron — waits for the local SD-Turbo model to finish
 * downloading, then generates ONE cover (smoke test) to validate quality on this
 * CPU-only host, commits + pushes it, and disables itself (one-shot).
 *
 * This unblocks the "see quality before scaling" step without a human watching the
 * download. Once it has generated + pushed the first cover, it removes its own
 * cron job so it never runs again.
 *
 * Run from repo root. Safe: only touches one cover image.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MODEL = path.join(ROOT, 'models', 'sd-turbo');
const PY = path.join(ROOT, '.venv-img', 'Scripts', 'python.exe');
const SELF_JOB = '726481e67a94'; // the real daily covergen cron (leave it)
const WATCHER_JOB = process.env.CRON_JOB_ID || '';

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

// Model ready?
if (!fs.existsSync(MODEL) || !fs.readdirSync(MODEL).some((f) => f.endsWith('.safetensors'))) {
  console.log('[covergen-smoke] model not ready yet — retry next run');
  process.exit(0);
}
if (!fs.existsSync(PY)) {
  console.log('[covergen-smoke] venv missing — retry next run');
  process.exit(0);
}

// Pick the first post that still has the OLD cover (mtime before this run).
const POSTS = path.join(ROOT, 'content', 'posts');
const IMG = path.join(ROOT, 'public', 'images');
const slug = fs.readdirSync(POSTS).find((f) => f.endsWith('.mdx'));
const m = fs.readFileSync(path.join(POSTS, slug), 'utf8').match(/cover:\s*['"]?(.*?)['"]?/m);
const coverRel = m ? m[1] : '';
const outFile = coverRel.startsWith('/images/') ? path.join(IMG, path.basename(coverRel)) : null;
if (!outFile) {
  console.log('[covergen-smoke] no local cover path found — abort');
  process.exit(0);
}

console.log(`[covergen-smoke] generating 1 cover for smoke test: ${outFile}`);
let out = '';
try {
  out = run(`node scripts/ai-blog-covergen.mjs --slug ${path.basename(slug, '.mdx')} --force 2>&1`);
} catch (e) {
  out = (e.stdout || '') + (e.stderr || '');
}
console.log(out.split('\n').slice(-4).join('\n'));

if (!fs.existsSync(outFile)) {
  console.log('[covergen-smoke] generation failed — retry next run');
  process.exit(0);
}

// Commit + push
try {
  run('git add -A');
  run('git -c user.email="ansy0@autopilot.local" -c user.name="Ansy Autopilot" commit -q -m "chore: AI cover smoke-test (open-source SD-Turbo, CPU)"');
  run('git push origin main 2>&1 | tail -2');
  console.log('[covergen-smoke] smoke-test cover pushed ✓');
} catch (e) {
  console.error('[covergen-smoke] push failed:', String(e.stderr || e.message).slice(-200));
  process.exit(1);
}

// Self-disable note: this watcher is meant to run ONCE. After it pushes the
// smoke-test cover, pause it via the cron tool (or set WATCHER_DONE). The daily
// cron 726481e67a94 carries the ongoing batch work.
if (WATCHER_JOB && fs.existsSync(outFile)) {
  console.log(`[covergen-smoke] DONE — pause watcher job ${WATCHER_JOB} (one-shot)`);
}
process.exit(0);

#!/usr/bin/env node
/**
 * ai-blog-covergen-smoketest.cron — waits for the local SD-Turbo model to finish
 * downloading, then generates ONE cover (smoke test) to validate quality on this
 * CPU-only host, commits + pushes it, and disables itself (one-shot).
 *
 * Run from repo root. Safe: only touches one cover image.
 *
 * Readiness fix: SD-Turbo ships weights nested under unet/vae/text_encoder (not a
 * top-level *.safetensors), and covergen_worker.py loads the fp32 component files,
 * so we wait for those three component .safetensors specifically.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const MODEL = path.join(ROOT, 'models', 'sd-turbo');
const PY = path.join(ROOT, '.venv-img', 'Scripts', 'python.exe');
const POSTS = path.join(ROOT, 'content', 'posts');
const IMG = path.join(ROOT, 'public', 'images');
// One-shot guard: even if the cron-pause below fails, we never regenerate twice.
const DONE = path.join(os.tmpdir(), 'ai-blog-covergen-smoke-done');
// Watcher job (this one). CRON_JOB_ID is injected by Hermes cron; fall back to the
// known id so self-pause always targets the right job.
const WATCHER_JOB = process.env.CRON_JOB_ID || 'ae4ab28d4cb7';
const DAILY_JOB = '726481e67a94'; // the real daily covergen cron — DO NOT TOUCH

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

if (fs.existsSync(DONE)) {
  console.log('[covergen-smoke] already completed (sentinel present) — one-shot, exiting');
  process.exit(0);
}

// Model readiness: SD-Turbo ships weights nested; the worker loads fp32 component
// files, so readiness = those three component .safetensors are present.
function hasSafetensors(dir) {
  if (!fs.existsSync(dir)) return false;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (hasSafetensors(path.join(dir, e.name))) return true;
    } else if (e.name.endsWith('.safetensors')) return true;
  }
  return false;
}
const componentsReady = [
  'unet/diffusion_pytorch_model.safetensors',
  'vae/diffusion_pytorch_model.safetensors',
  'text_encoder/model.safetensors',
].every((rel) => fs.existsSync(path.join(MODEL, rel)));

if (!hasSafetensors(MODEL) || !componentsReady) {
  console.log('[covergen-smoke] model not ready yet (missing component weights) — retry next run');
  process.exit(0);
}
if (!fs.existsSync(PY)) {
  console.log('[covergen-smoke] venv missing — retry next run');
  process.exit(0);
}

// Pick the first post that declares a LOCAL cover (so we overwrite an existing file).
const mdxFiles = fs.readdirSync(POSTS).filter((f) => f.endsWith('.mdx'));
const slug = mdxFiles.find((f) => {
  const raw = fs.readFileSync(path.join(POSTS, f), 'utf8');
  const m = raw.match(/cover:\s*['"]?(.*?)['"]?/m);
  return m && m[1].startsWith('/images/');
});
if (!slug) {
  console.log('[covergen-smoke] no post with a local cover found — abort');
  process.exit(0);
}
const raw = fs.readFileSync(path.join(POSTS, slug), 'utf8');
const m = raw.match(/cover:\s*['"]?(.*?)['"]?/m);
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

// One-shot: mark done + disable the watcher cron so it never runs again.
fs.writeFileSync(DONE, new Date().toISOString());
if (WATCHER_JOB && WATCHER_JOB !== DAILY_JOB) {
  try {
    run(`hermes cron pause ${WATCHER_JOB}`);
    console.log(`[covergen-smoke] paused watcher ${WATCHER_JOB} ✓`);
  } catch (e) {
    console.log(`[covergen-smoke] auto-pause failed (sentinel set): ${String(e.message).slice(0, 120)}`);
  }
}
process.exit(0);

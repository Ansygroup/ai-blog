#!/usr/bin/env node
/**
 * ai-blog-covergen.cron — daily self-completing cover regeneration.
 *
 * Regenerates blog covers with an OPEN-SOURCE local model (SD-Turbo via diffusers,
 * CPU-only). Runs a BATCH per day so it never hammers the CPU or exhausts the
 * Vercel 100-deploys/day limit. Idempotent: skips any cover already (re)generated
 * in a prior run, so over many days all 669 posts get refreshed and then it
 * naturally goes idle.
 *
 * Each successful batch is committed + pushed (Vercel deploys on push). If the
 * model is still downloading or generation fails, it exits 0 and retries next run.
 *
 * Usage (cron): node scripts/ai-blog-covergen.cron.mjs
 * Env: COVERGEN_BATCH (default 15)
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BATCH = parseInt(process.env.COVERGEN_BATCH || '15', 10);

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
}

console.log(`[covergen-cron] batch=${BATCH}`);

// Model ready?
const modelDir = path.join(ROOT, 'models', 'sd-turbo');
if (!fs.existsSync(modelDir) || !fs.readdirSync(modelDir).some((f) => f.endsWith('.safetensors'))) {
  console.log('[covergen-cron] model not ready yet (still downloading) — retry next run');
  process.exit(0);
}

// venv ready?
const py = path.join(ROOT, '.venv-img', 'Scripts', 'python.exe');
if (!fs.existsSync(py)) {
  console.log('[covergen-cron] venv missing — retry next run');
  process.exit(0);
}

// count pending first
let pending = 0;
try {
  const out = run('node scripts/ai-blog-covergen.mjs --dry 2>&1');
  const m = out.match(/pending=(\d+)/);
  pending = m ? parseInt(m[1], 10) : 0;
} catch {
  pending = 0;
}
console.log(`[covergen-cron] pending=${pending}`);
if (pending === 0) {
  console.log('[covergen-cron] all covers up to date — nothing to do');
  process.exit(0);
}

// Generate this batch
let genOut = '';
try {
  genOut = run(`node scripts/ai-blog-covergen.mjs --batch ${BATCH} 2>&1`);
} catch (e) {
  genOut = (e.stdout || '') + (e.stderr || '');
}
console.log(genOut.split('\n').slice(-4).join('\n'));

const doneMatch = genOut.match(/DONE generated=(\d+)/);
const done = doneMatch ? parseInt(doneMatch[1], 10) : 0;
if (done === 0) {
  console.log('[covergen-cron] no covers generated this run — retry next run');
  process.exit(0);
}

// Commit + push (deploy happens via CI)
try {
  run('git add -A');
  run(`git -c user.email="ansy0@autopilot.local" -c user.name="Ansy Autopilot" commit -q -m "chore: regenerate ${done} AI covers (open-source SD-Turbo)"`);
  run('git push origin main 2>&1 | tail -2');
  console.log(`[covergen-cron] committed + pushed ${done} covers`);
} catch (e) {
  console.error('[covergen-cron] commit/push failed:', String(e.stderr || e.message).slice(-200));
  process.exit(1);
}

console.log('[covergen-cron] OK — Vercel will deploy on push');
process.exit(0);

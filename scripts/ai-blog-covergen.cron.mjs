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
// Only the `local` backend (SD-Turbo) needs the weights on disk. The default
// backend is Flux (Pollinations, free, no key), which needs no local model — so
// gating every run on the SD-Turbo download would block covers indefinitely.
const BACKEND = process.env.COVERGEN_BACKEND || 'flux';
const modelDir = path.join(ROOT, 'models', 'sd-turbo');
// Readiness = the fp16 weights the worker actually loads (the disk-safe download
// skips the redundant ~3.4GB merged root file, so we check the real components).
const unetFp16 = path.join(modelDir, 'unet', 'diffusion_pytorch_model.fp16.safetensors');
const teFp16 = path.join(modelDir, 'text_encoder', 'model.fp16.safetensors');
if (
  BACKEND === 'local' &&
  (!fs.existsSync(modelDir) || !fs.existsSync(unetFp16) || !fs.existsSync(teFp16))
) {
  console.log('[covergen-cron] model not ready yet (still downloading) — retry next run');
  process.exit(0);
}
console.log(`[covergen-cron] backend=${BACKEND}`);

// venv ready?
const py = path.join(ROOT, '.venv-img', 'Scripts', 'python.exe');
if (!fs.existsSync(py)) {
  console.log('[covergen-cron] venv missing — retry next run');
  process.exit(0);
}

// The ambient PYTHONPATH (Hermes' own venv site-packages) shadows this venv's
// PIL and kills the worker on import with "cannot import name '_imaging'".
// The cron inherits the scheduler's env, so strip it for every child process —
// otherwise a fully provisioned venv still reports zero covers, silently.
const childEnv = { ...process.env };
delete childEnv.PYTHONPATH;

// Cheap readiness probe: the venv must be able to import PIL, or every generate
// call would fail one-per-post and waste the whole batch window.
try {
  run(`"${py}" -c "import PIL"`, { env: childEnv });
} catch (e) {
  console.log('[covergen-cron] venv cannot import PIL — retry next run');
  process.exit(0);
}

// count pending first
let pending = 0;
try {
  const out = run(`node scripts/ai-blog-covergen.mjs --dry --backend ${BACKEND} 2>&1`, { env: childEnv });
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
  genOut = run(`node scripts/ai-blog-covergen.mjs --batch ${BATCH} --backend ${BACKEND} 2>&1`, { env: childEnv });
} catch (e) {
  genOut = (e.stdout || '') + (e.stderr || '');
}
// Keep the fallback signal and the DONE line; the tail alone dropped the reason
// the run failed, which made every batch look identical in the cron log.
console.log(
  genOut
    .split('\n')
    .filter((l) => /DONE generated=|falling back|placeholder covers detected|backend=/.test(l))
    .slice(-5)
    .join('\n')
);

const doneMatch = genOut.match(/DONE generated=(\d+)/);
const done = doneMatch ? parseInt(doneMatch[1], 10) : 0;
if (done === 0) {
  console.log('[covergen-cron] no covers generated this run — retry next run');
  process.exit(0);
}

// Commit + push (deploy happens via CI)
try {
  run('git add -A');
  run(`git -c user.email="ansy0@autopilot.local" -c user.name="Ansy Autopilot" commit -q -m "chore: regenerate ${done} AI covers (${BACKEND})"`);
  run('git push origin main 2>&1 | tail -2');
  console.log(`[covergen-cron] committed + pushed ${done} covers`);
} catch (e) {
  console.error('[covergen-cron] commit/push failed:', String(e.stderr || e.message).slice(-200));
  process.exit(1);
}

console.log('[covergen-cron] OK — Vercel will deploy on push');
process.exit(0);

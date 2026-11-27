#!/usr/bin/env node
/**
 * ai-blog-adsense-deploy.cron — self-completing deploy that ships the real
 * AdSense client to production, and only "finishes" once the live site serves it.
 *
 * Blocker-aware:
 *  - Vercel free tier caps deployments at 100/day. The autopilot bot burns that
 *    quota, so a direct `vercel deploy` often fails with
 *    "api-deployments-free-per-day". This script DETECTS that exact error and
 *    exits 0 (no-op) so it stays a no-op until the quota resets, then completes
 *    the deploy + live verification on the next run. No human intervention needed.
 *  - Vercel also rejects source uploads with >15000 files ("missing_archive").
 *    This script DETECTS that error and automatically retries with
 *    `--archive=tgz`, which bypasses the file-count limit. If the tgz retry
 *    still fails for a non-quota reason, it exits 1 so the failure is reported
 *    (it does NOT silently pretend the deploy succeeded).
 *
 * Run from the repo root: node scripts/ai-blog-adsense-deploy.cron.mjs
 */
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// Always run from the repo root so `vercel deploy` finds the linked project,
// regardless of the shell's current working directory.
const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
process.chdir(REPO_ROOT);

const REAL = 'ca-pub-4665838048081250';
const SITE = 'https://ai-blog-ten-steel.vercel.app';

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function liveAdsense() {
  try {
    const html = run(`curl -s --max-time 25 "${SITE}/?cb=${Date.now()}"`);
    const m = html.match(/ca-pub-\d+/);
    return m ? m[0] : null;
  } catch { return null; }
}

function deploy(args) {
  try {
    return run(`vercel deploy --prod --yes ${args} 2>&1`);
  } catch (e) {
    return (e.stdout || '') + (e.stderr || '');
  }
}

function isQuota(out) {
  return /api-deployments-free-per-day/.test(out);
}

console.log('[adsense-deploy] checking live AdSense client...');
const live = liveAdsense();
console.log(`[adsense-deploy] live = ${live}`);

if (live === REAL) {
  console.log('[adsense-deploy] ALREADY LIVE ✓ nothing to do');
  process.exit(0);
}

console.log('[adsense-deploy] live is stale — attempting deploy...');

// Attempt 1: normal prod deploy
let out = deploy('');

if (isQuota(out)) {
  console.log('[adsense-deploy] QUOTA EXHAUSTED — will retry next run (blocker not cleared yet)');
  process.exit(0); // self-completing: try again when cron fires again
}

// Attempt 2: file-count limit ("missing_archive") — retry with a tgz archive
if (/missing_archive|more than 15000 items|files should NOT have more than/.test(out)) {
  console.log('[adsense-deploy] file-count limit hit — retrying with --archive=tgz ...');
  out = deploy('--archive=tgz');
  if (isQuota(out)) {
    console.log('[adsense-deploy] QUOTA EXHAUSTED (tgz retry) — will retry next run');
    process.exit(0);
  }
}

// Any other deploy failure (including a failed tgz retry) is reportable.
if (/status":\s*"error"|"reason":\s*"[a-z_]+"|deploy_failed|Error:|missing_archive/.test(out)) {
  console.error('[adsense-deploy] deploy failed for non-quota reason:\n' + out.slice(-1200));
  process.exit(1);
}

console.log('[adsense-deploy] deploy submitted, re-checking live shortly...');
// give Vercel a moment to propagate
await new Promise((r) => setTimeout(r, 20000));
const after = liveAdsense();
console.log(`[adsense-deploy] live after deploy = ${after}`);
if (after === REAL) {
  console.log('[adsense-deploy] SUCCESS — real AdSense client is now live ✓');
  process.exit(0);
}
console.log('[adsense-deploy] deploy accepted but not yet propagated — next run will confirm');
process.exit(0);

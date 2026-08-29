#!/usr/bin/env node
/**
 * generic-auto-complete.mjs — self-completing workflow for any repo.
 * Runs on cron. Checks for available credentials and finishes pending work:
 *   - .env with STRIPE_SECRET_KEY → runs `npm run stripe:links` if present
 *   - git remote reachable        → pull --rebase + commit + push pending work
 * Idempotent and prompt-free.
 *
 * Usage: node generic-auto-complete.mjs   (run inside the target repo)
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

// Never let git (or Git Credential Manager) prompt for a password on a
// non-tty stdin — that is what surfaces as "stdin is not a tty" under cron.
process.env.GIT_TERMINAL_PROMPT = '0';
process.env.GCM_INTERACTIVE = 'never';
// Stop GCM from probing a tty entirely; fall back to cached/store creds.
process.env.GIT_ASKPASS = '';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const envPath = resolve(root, '.env');

function log(m) { console.log(`[auto ${new Date().toISOString()}] ${m}`); }
// sh writes child output through to our stdout/stderr (already redirected).
function sh(cmd) { return execSync(cmd, { cwd: root, stdio: 'inherit', env: process.env }); }
// capture(cmd) hides output and returns trimmed stdout (for status checks).
function capture(cmd) { return execSync(cmd, { cwd: root, encoding: 'utf8', env: process.env }).trim(); }
// run a network git op with one retry to absorb transient GCM/tty cold-starts.
function netGit(cmd, label) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try { sh(cmd); return true; }
    catch (e) {
      const msg = e.message.split('\n')[0];
      if (attempt === 1) { log(`⚠ ${label} attempt 1 failed (${msg}) — retrying…`); continue; }
      log(`⚠ ${label} skipped: ${msg}`); return false;
    }
  }
  return false;
}

try {
  // Stripe links if a usable key + generator exist.
  if (existsSync(envPath)) {
    const env = readFileSync(envPath, 'utf8');
    const m = env.match(/STRIPE_SECRET_KEY=(\S+)/);
    if (m && m[1] && m[1].startsWith('sk_') && existsSync(resolve(root, 'scripts/gen-stripe-links.mjs'))) {
      log('key + gen script found — generating links…');
      try { sh('node scripts/gen-stripe-links.mjs'); log('✅ links done'); }
      catch (e) { log(`⚠ links failed: ${e.message.split('\n')[0]}`); }
    }
  }

  // Git auto-push (best-effort, never throws out of this block).
  let st = '';
  try { st = capture('git status --short'); } catch (e) { log(`⚠ status check failed: ${e.message.split('\n')[0]}`); }
  if (st) {
    try {
      execSync('git add -A', { cwd: root, env: process.env });
      execSync('git -c user.email="ansy0@ansygroup.com" -c user.name="ansy0" commit -q -m "chore: auto-complete pending work"', { cwd: root, env: process.env });
      log('✅ committed local changes');
    } catch (e) { log(`⚠ commit failed: ${e.message.split('\n')[0]}`); }
  }
  let b = 'main';
  try { b = capture('git branch --show-current') || 'main'; } catch (_) {}
  netGit(`git pull --rebase origin ${b}`, 'pull');
  if (netGit(`git push origin ${b}`, 'push')) log('✅ pushed');
} catch (e) {
  log(`⚠ unexpected error: ${e.message.split('\n')[0]}`);
} finally {
  log('done.');
}

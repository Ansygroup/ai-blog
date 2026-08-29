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

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const envPath = resolve(root, '.env');

function log(m) { console.log(`[auto ${new Date().toISOString()}] ${m}`); }
function sh(cmd) { return execSync(cmd, { cwd: root, stdio: 'inherit', env: process.env }); }

// Stripe links if script exists
if (existsSync(envPath)) {
  const env = readFileSync(envPath, 'utf8');
  const m = env.match(/STRIPE_SECRET_KEY=(\S+)/);
  if (m && m[1] && m[1].startsWith('sk_') && existsSync(resolve(root, 'scripts/gen-stripe-links.mjs'))) {
    log('key + gen script found — generating links…');
    try { sh('node scripts/gen-stripe-links.mjs'); log('✅ links done'); }
    catch (e) { log(`⚠ links failed: ${e.message.split('\n')[0]}`); }
  }
}

// Git auto-push
try {
  const st = execSync('git status --short', { cwd: root, encoding: 'utf8' }).trim();
  if (st) {
    execSync('git add -A', { cwd: root });
    execSync('git -c user.email="ansy0@ansygroup.com" -c user.name="ansy0" commit -q -m "chore: auto-complete pending work"', { cwd: root });
    log('✅ committed local changes');
  }
  const b = execSync('git branch --show-current', { cwd: root, encoding: 'utf8' }).trim();
  try { sh(`git pull --rebase origin ${b}`); }
  catch (pe) { log(`⚠ pull skipped: ${pe.message.split('\n')[0]}`); }
  try { sh(`git push origin ${b}`); log('✅ pushed'); }
  catch (e) { log(`⚠ push skipped (no auth?): ${e.message.split('\n')[0]}`); }
} catch (e) { log(`⚠ git step failed: ${e.message.split('\n')[0]}`); }
log('done.');

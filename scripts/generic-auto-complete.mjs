#!/usr/bin/env node
/**
 * generic-auto-complete.mjs — self-completing workflow for any repo.
 * Runs on cron. Checks for available credentials and finishes pending work:
 *   - .env with STRIPE_SECRET_KEY → runs `npm run stripe:links` if present
 *   - git remote reachable        → commit + push pending work (self-healing)
 * Idempotent and prompt-free.
 *
 * Usage: node generic-auto-complete.mjs   (run inside the target repo)
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

// Never let git (or Git Credential Manager) prompt for a password on a
// non-tty stdin — that surfaces as "stdin is not a tty" under cron. (First
// cold-start may still need a one-time tty to cache the credential; once
// cached, non-tty runs work fine.)
// Fully non-interactive: never fall back to the GUI 'manager' credential
// helper (which opens a tty / prompts for auth on a cold cache and surfaces
// as the uncaught 'stdin is not a tty' error under cron). Force the tty-free
// 'store' helper, which already holds the cached github.com credentials.
process.env.GIT_TERMINAL_PROMPT = '0';
process.env.GCM_INTERACTIVE = 'never';
process.env.GIT_ASKPASS = '/bin/true';
process.env.GIT_PAGER = 'cat';
process.env.GIT_CONFIG_COUNT = '2';
process.env.GIT_CONFIG_KEY_0 = 'credential.helper';
process.env.GIT_CONFIG_VALUE_0 = '';
process.env.GIT_CONFIG_KEY_1 = 'credential.helper';
process.env.GIT_CONFIG_VALUE_1 = 'store';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const envPath = resolve(root, '.env');

function log(m) { console.log(`[auto ${new Date().toISOString()}] ${m}`); }
function sh(cmd) { return execSync(cmd, { cwd: root, stdio: 'inherit', env: process.env }); }
function capture(cmd) { return execSync(cmd, { cwd: root, encoding: 'utf8', env: process.env }).trim(); }
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
      const staged = capture('git diff --cached --name-only');
      if (staged.trim()) {
        // Skip the commit if the ONLY differences are line-ending / trailing
        // whitespace noise (CRLF<->LF). Real edits still commit normally.
        const real = capture('git diff --cached --ignore-space-at-eol --name-only');
        if (!real.trim()) {
          log('ℹ only line-ending/whitespace changes — discarding to keep tree clean');
          // Discard the worktree noise so the upcoming 'git pull --rebase'
          // does not abort on unstaged changes, then unstage.
          execSync('git checkout -- .', { cwd: root, env: process.env });
          execSync('git reset -q', { cwd: root, env: process.env });
        } else {
          execSync('git -c user.email="ansy0@ansygroup.com" -c user.name="ansy0" commit -q -m "chore: auto-complete pending work"', { cwd: root, env: process.env });
          log('✅ committed local changes');
        }
      } else {
        log('ℹ no staged changes to commit');
        execSync('git reset -q', { cwd: root, env: process.env });
      }
    } catch (e) { log(`⚠ commit failed: ${e.message.split('\n')[0]}`); }
  } else {
    log('ℹ working tree clean — nothing to commit');
  }

  let b = 'main';
  try { b = capture('git branch --show-current') || 'main'; } catch (_) {}

  // Self-healing push: a plain pull --rebase first, then push. If the remote
  // advanced in the window between pull and push ("fetch first" / non-fast-
  // forward), rebase-pull again and retry, up to 3 times, so a transient
  // divergence never silently drops pending work.
  netGit(`git pull --rebase origin ${b}`, 'pull');
  let pushed = false;
  for (let attempt = 1; attempt <= 3 && !pushed; attempt++) {
    if (netGit(`git push origin ${b}`, `push (try ${attempt})`)) { pushed = true; break; }
    log('↻ remote diverged — rebasing and retrying…');
    netGit(`git pull --rebase origin ${b}`, `rebase-pull (try ${attempt})`);
  }
  if (pushed) log('✅ pushed'); else log('⚠ push failed after retries — manual intervention needed');
} catch (e) {
  log(`⚠ unexpected error: ${e.message.split('\n')[0]}`);
} finally {
  log('done.');
}

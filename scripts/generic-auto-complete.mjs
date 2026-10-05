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
import { readFileSync, existsSync, statSync, rmSync } from 'node:fs';
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
function sh(cmd) { return execSync(cmd, { cwd: root, stdio: ['ignore','inherit','inherit'], env: process.env, maxBuffer: 64*1024*1024 }); }
function capture(cmd) { return execSync(cmd, { cwd: root, encoding: 'utf8', env: process.env, maxBuffer: 64*1024*1024 }).trim(); }
// Synchronous sleep - execSync blocks the loop, so timers never fire here.
const sleep = (ms) => { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); };

// A crashed or duplicated git process leaves .git/index.lock behind, and every
// later 'git add -A' then dies with "File exists". That failure used to be
// swallowed, the script carried on, and 'git push' reported success on a no-op
// -> a false "pushed" while the work sat unpushed. Age-gate the reclaim: only
// remove a lock old enough that no live git could still be writing it.
const STALE_LOCK_MS = 120000;
function lockAgeMs() {
  try {
    const lock = resolve(root, '.git/index.lock');
    if (!existsSync(lock)) return -1;
    return Date.now() - statSync(lock).mtimeMs;
  } catch (_) { return -1; }
}

function gitLocked(label, cmd, { staleMs = STALE_LOCK_MS, tries = 4 } = {}) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    try { sh(cmd); return true; }
    catch (e) {
      const msg = e.message.split('\n')[0];
      if (/index\.lock/i.test(e.message)) {
        const age = lockAgeMs();
        if (age > staleMs) {
          log(`STALE-LOCK ${label}: .git/index.lock is ${Math.round(age / 1000)}s old - reclaiming`);
          try { rmSync(resolve(root, '.git/index.lock'), { force: true }); }
          catch (e2) { log(`STALE-LOCK removal failed: ${e2.message.split('\n')[0]}`); }
          continue;
        }
        log(`BUSY ${label}: git index locked (${Math.max(0, Math.round(age / 1000))}s old) - retry ${attempt}/${tries}`);
        sleep(5000);
        continue;
      }
      log(`FAILED ${label}: ${msg}`);
      return false;
    }
  }
  log(`FAILED ${label}: gave up after ${tries} attempts (index.lock contention)`);
  return false;
}

// Capture combined push output. 'git push' exits 0 on a no-op
// ("Everything up-to-date"), so exit code alone cannot prove anything shipped.
function pushCapture(cmd) {
  try {
    return execSync(cmd, {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env, maxBuffer: 64 * 1024 * 1024,
    }) || '';
  } catch (e) {
    return `${e.stdout || ''}${e.stderr || ''}`;
  }
}

// Authoritative post-push check: does origin/<branch> actually equal local HEAD?
function remoteMatchesHead(branch) {
  try {
    capture(`git fetch origin ${branch}`);
    return capture('git rev-parse HEAD') === capture('git rev-parse FETCH_HEAD');
  } catch (e) {
    log(`remote-verify failed: ${e.message.split('\n')[0]}`);
    return false;
  }
}

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

  let hadChanges = false;
  let commitOk = true;
  if (st) {
    hadChanges = true;
    try {
      if (!gitLocked('add', 'git add -A')) { commitOk = false; throw new Error('git add -A did not complete'); }
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
    hadChanges = false;
    log('ℹ working tree clean — nothing to commit');
  }

  let b = 'main';
  try { b = capture('git branch --show-current') || 'main'; } catch (_) {}

  // Self-healing push: a plain pull --rebase first, then push. If the remote
  // advanced in the window between pull and push ("fetch first" / non-fast-
  // forward), rebase-pull again and retry, up to 3 times, so a transient
  // divergence never silently drops pending work.
  netGit(`git pull --rebase origin ${b}`, 'pull');
  // A no-op push ("Everything up-to-date") exits 0, so success is decided by
  // comparing origin/<branch> to local HEAD after the fact - not by exit code.
  let verified = false;
  for (let attempt = 1; attempt <= 3 && !verified; attempt++) {
    const out = pushCapture(`git push origin ${b}`);
    if (!/Everything up-to-date/i.test(out) && /rejected|non-fast-forward|could not read|failed to push/i.test(out)) {
      log(`\u21bb push (try ${attempt}) rejected - rebasing and retrying...`);
      log(out.split('\n').filter((l) => l.trim()).slice(-3).join(' | '));
      netGit(`git pull --rebase origin ${b}`, `rebase-pull (try ${attempt})`);
      continue;
    }
    verified = remoteMatchesHead(b);
    if (verified) break;
    log(`push (try ${attempt}) left origin behind local - retrying...`);
  }

  if (verified) {
    log(`\u2705 verified: origin/${b} == local HEAD ${capture('git rev-parse --short HEAD')}`);
    if (!commitOk && hadChanges) log('\u26a0\ufe0f NOTE: local changes remain UNCOMMITTED - inspect working tree');
  } else {
    log('\u26a0\ufe0f PUSH NOT VERIFIED - local commits may be unpushed; manual intervention needed');
  }
} catch (e) {
  log(`⚠ unexpected error: ${e.message.split('\n')[0]}`);
} finally {
  log('done.');
}

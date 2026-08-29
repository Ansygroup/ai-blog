#!/usr/bin/env node
/**
 * generic-auto-complete.mjs — self-completing workflow for any repo.
 * Runs on cron. Checks for available credentials and finishes pending work:
 *   - .env with STRIPE_SECRET_KEY → runs `npm run stripe:links` if present
 *   - git remote reachable        → commit + push pending work
 * Idempotent and prompt-free.
 *
 * Usage: node generic-auto-complete.mjs   (run inside the target repo)
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const envPath = resolve(root, '.env');

function log(m) { console.log(`[auto ${new Date().toISOString()}] ${m}`); }

// Stripe links if script exists
if (existsSync(envPath)) {
  const env = readFileSync(envPath, 'utf8');
  const m = env.match(/STRIPE_SECRET_KEY=(\S+)/);
  if (m && m[1] && m[1].startsWith('sk_') && existsSync(resolve(root, 'scripts/gen-stripe-links.mjs'))) {
    log('key + gen script found — generating links…');
    try { execSync('node scripts/gen-stripe-links.mjs', { cwd: root, stdio: 'inherit' }); log('✅ links done'); }
    catch (e) { log(`⚠ links failed: ${e.message}`); }
  }
}

// Git auto-push
try {
  const st = execSync('git status --short', { cwd: root, encoding: 'utf8' }).trim();
  if (st) { execSync('git add -A', { cwd: root }); execSync('git -c user.email="ansy0@ansygroup.com" -c user.name="ansy0" commit -q -m "chore: auto-complete pending work"', { cwd: root }); }
  const b = execSync('git branch --show-current', { cwd: root, encoding: 'utf8' }).trim();
  execSync(`git push origin ${b}`, { cwd: root, stdio: 'inherit' });
  log('✅ pushed');
} catch (e) { log(`⚠ push skipped: ${e.message.split('\n')[0]}`); }
log('done.');

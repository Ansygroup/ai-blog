#!/usr/bin/env node
/**
 * scripts/daily-growth-engine.js
 *
 * The DAILY autonomous growth pipeline (Hermes-owned cron). It:
 *   1. competitor-scout  — scrape competitor sitemaps, harvest AI topics,
 *                           push NEW ones into keyword-queue.json
 *   2. media-gen         — generate on-topic cover images for posts missing one
 *   3. (existing CI)     — queue-refill + scheduled-content workflows pick the
 *                           queue and publish via generate-post.js on their own
 *   4. seo-optimizer     — keep frontmatter clean
 *   5. commit + push      — so Vercel redeploys with new content + images
 *
 * Safe to run daily. Idempotent. No external auth (uses public sitemaps + free
 * image source). Network failures are non-fatal.
 *
 * Usage:
 *   node scripts/daily-growth-engine.js
 *   node scripts/daily-growth-engine.js --dry-run
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRY = process.argv.includes('--dry-run');

const run = (cmd, fatal = false) => {
  console.log(`\n$ ${cmd}`);
  if (DRY) return 0;
  try { return execSync(cmd, { cwd: ROOT, stdio: 'inherit' }).status ?? 0; }
  catch (e) { console.warn(`  ! step failed${fatal ? '' : ' (non-fatal)'}: ${e.message}`); return 1; }
};

console.log('\n════════════════════════════════════════════════════════');
console.log('  DAILY GROWTH ENGINE  —  competitor scout + media + SEO');
console.log('════════════════════════════════════════════════════════\n');

// SAFETY PRE-FLIGHT: a local engine run was observed wiping the whole project +
// .git. Abort (do not run) if the tree is degraded. Recovery = re-clone.
for (const must of ['content/posts', 'app', 'scripts', 'data']) {
  if (!fs.existsSync(path.join(ROOT, must))) {
    console.error(`\n✗ ABORT: missing '${must}' — tree looks degraded. Refusing to run.`);
    process.exit(1);
  }
}

run('node scripts/competitor-scout.js');
run('node scripts/media-gen.js');
// Amazon was removed by user order 2026-08-26 ("شيل امازون بالكامل") and MUST
// NOT be re-added. The previous affiliate-audit/affiliate-fill calls did exactly
// that on 2026-10-02 (636/685 posts re-linked). strip-amazon-links.py is
// idempotent and returns non-zero if any amazon.com/dp survives.
run('python scripts/strip-amazon-links.py', true);
// Guard: parallel-publish pulls topics from the queue BEFORE generating.
// If no AI provider key is configured locally, every pull is silently lost
// (generation fails, CI can't see them). Skip and let GitHub Actions publish.
const hasLocalKey = (() => {
  try {
    require('dotenv').config({ path: path.join(ROOT, '.env.local') });
  } catch { /* dotenv optional */ }
  return ['GROQ_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'OPENROUTER_API_KEY', 'NVIDIA_API_KEY', 'OPENAI_API_KEY']
    .some(k => process.env[k]);
})();
if (hasLocalKey) {
  // Guard: parallel-publish POPS topics off the queue BEFORE generating. If
  // generation dies (timeout/429) the topics are LOST forever. Snapshot first,
  // then re-append anything missing afterwards.
  const QUEUE = path.join(ROOT, 'scripts', 'keyword-queue.json');
  const BACKUP = path.join(ROOT, 'data', 'keyword-queue.backup.json');
  const before = fs.existsSync(QUEUE) ? JSON.parse(fs.readFileSync(QUEUE, 'utf8')) : [];
  fs.writeFileSync(BACKUP, JSON.stringify(before, null, 2));
  run(`timeout 480 node scripts/parallel-publish.js --count 20 --concurrency 3`);
  const after = fs.existsSync(QUEUE) ? JSON.parse(fs.readFileSync(QUEUE, 'utf8')) : [];
  const missing = before.filter(t => !JSON.stringify(after).includes(JSON.stringify(t)));
  if (missing.length) {
    fs.writeFileSync(QUEUE, JSON.stringify(after.concat(missing), null, 2));
    console.log(`  ↩ restored ${missing.length} topic(s) drained but not published: ${missing.join(', ')}`);
  } else {
    console.log(`  ↩ queue intact (${before.length} → ${after.length}, nothing lost).`);
  }
} else {
  console.log('\n⏭ No local AI provider key — skipping local publish (queue left for CI).');
}
run('node scripts/seo-optimizer.js --fix');

// commit + push so Vercel redeploys
if (!DRY) {
  try {
    execSync('git add -A', { cwd: ROOT });
    const status = execSync('git status --porcelain', { cwd: ROOT }).toString().trim();
    if (status) {
      const stamp = new Date().toISOString().slice(0, 10);
      execSync(`git commit -q -m "auto: daily growth — competitor topics + media + seo (${stamp})"`, { cwd: ROOT });
      // rebase-safe push
      try { execSync('git pull --rebase origin main', { cwd: ROOT, stdio: 'inherit' }); }
      catch (e) { console.warn('  ! rebase had conflicts — resolve manually or next run will retry'); }
      execSync('git push origin main', { cwd: ROOT, stdio: 'inherit' });
      console.log('\n✓ Pushed to origin/main — Vercel will redeploy.');
    } else {
      console.log('\n✓ Nothing new to commit.');
    }
  } catch (e) {
    console.warn(`  ! git step failed (non-fatal): ${e.message}`);
  }
}

const report = `# Daily Growth Engine\n\n- Date: ${new Date().toISOString() }\n- Mode: ${DRY ? 'dry-run' : 'live'}\n- Pipeline: competitor-scout -> media-gen -> affiliate-fill -> seo-optimizer -> commit/push\n`;
fs.writeFileSync(path.join(ROOT, 'data', 'daily-growth-report.md'), report);
console.log(`\n✓ Daily growth engine complete.`);

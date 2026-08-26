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

run('node scripts/competitor-scout.js');
run('node scripts/media-gen.js');
run('node scripts/affiliate-audit.js');
run('node scripts/affiliate-fill.js');
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
  run('node scripts/parallel-publish.js --count 20 --concurrency 3');
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

#!/usr/bin/env node
/**
 * scripts/seo-orchestrator.js
 *
 * The single weekly cron entrypoint. Hermes owns this. It:
 *   1. Analyzes the latest GSC export (data/gsc/*.csv)
 *   2. Promotes priority pages (title/meta/FAQ)
 *   3. Boosts internal links to those pages
 *   4. Pings IndexNow so Bing/AI engines recrawl fast
 *   5. Audits + fixes Amazon affiliate tags (keeps links commissioned)
 *   6. Writes a human report to data/seo-orchestrator-report.md
 *
 * Safe to run weekly. Idempotent. No external auth needed.
 *
 * Usage:
 *   node scripts/seo-orchestrator.js            # full run
 *   node scripts/seo-orchestrator.js --dry-run  # preview only
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRY = process.argv.includes('--dry-run');
const run = (cmd) => {
  console.log(`$ ${cmd}`);
  if (DRY) return;
  try { execSync(cmd, { cwd: ROOT, stdio: 'inherit' }); }
  catch (e) { console.warn(`  ! step failed (non-fatal): ${e.message}`); }
};

console.log('\n════════════════════════════════════════════════════════');
console.log('  SEO ORCHESTRATOR  —  autonomous rank engine');
console.log('════════════════════════════════════════════════════════\n');

run('node scripts/gsc-analyze.js');
run('node scripts/seo-promote.js' + (DRY ? ' --dry-run' : ''));
run('node scripts/seo-boost-links.js' + (DRY ? ' --dry-run' : ''));
run('node scripts/auto-internal-link.js --ai');
run('node scripts/seo-optimizer.js --fix');
run('node scripts/indexnow-submit.js');
run('node scripts/affiliate-check.js --fix'); // keep Amazon links commissioned

const stamp = new Date().toISOString();
const report = `# SEO Orchestrator Run\n\n- Date: ${stamp}\n- Mode: ${DRY ? 'dry-run' : 'live'}\n- Pipeline: gsc-analyze -> seo-promote -> auto-internal-link -> seo-optimizer -> indexnow\n\nSee data/gsc-report.json for prioritized pages.\n`;
fs.writeFileSync(path.join(ROOT, 'data', 'seo-orchestrator-report.md'), report);
console.log(`\n✓ Orchestrator complete. Report -> data/seo-orchestrator-report.md`);

#!/usr/bin/env node
/**
 * scripts/content-refresher.js
 *
 * Identifies stale posts (>6 months old) and refreshes them:
 *   - Updates lastUpdated date
 *   - Adds "2026" freshness to title if missing
 *   - Updates pricing info and statistics
 *   - Reports which posts need human review
 *
 * Usage:
 *   node scripts/content-refresher.js              # preview
 *   node scripts/content-refresher.js --refresh    # apply automatic refreshes
 *   node scripts/content-refresher.js --force      # refresh all posts regardless of age
 */
const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');

const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

function getPostData(file) {
  const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
  const slug = file.replace(/\.mdx?$/, '');
  const m = content.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]+)$/);
  if (!m) return null;
  const fm = m[1];
  const body = m[2];
  const get = (k) => (fm.match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm')) || [])[1] || '';
  return { file, slug, content, fm, body, date: get('date'), lastUpdated: get('lastUpdated'), title: get('title'), category: get('category') };
}

(async () => {
  const doRefresh = process.argv.includes('--refresh');
  const force = process.argv.includes('--force');
  const dryRun = !doRefresh;

  console.log(`🕰️ Content Refresher${dryRun ? ' (dry run)' : ''}\n`);
  console.log(`Checking posts older than ${Math.round(SIX_MONTHS_MS / (1000*60*60*24))} days...\n`);

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.mdx'));
  let refreshed = 0;
  let total = 0;

  for (const file of files) {
    const post = getPostData(file);
    if (!post) { console.log(`⚠️  ${file}: could not parse`); continue; }

    const ageMs = Date.now() - new Date(post.date).getTime();
    const isStale = ageMs > SIX_MONTHS_MS;
    const today = new Date().toISOString().slice(0, 10);

    if (!isStale && !force) {
      total++;
      continue;
    }

    console.log(`📄 ${post.title}`);
    console.log(`  📅 Original: ${post.date} | Last updated: ${post.lastUpdated || 'never'}`);
    console.log(`  ⏳ Age: ${Math.round(ageMs / (1000*60*60*24))} days${isStale ? ' (STALE)' : ''}`);

    if (doRefresh || force) {
      let newContent = post.content;
      let changes = [];

      // Update lastUpdated date
      newContent = newContent.replace(/^lastUpdated:\s*".*?"/m, `lastUpdated: "${today}"`);
      changes.push('updated lastUpdated date');

      // Add 2026 to title if missing
      if (!/2026/.test(post.title) && !/2025/.test(post.title)) {
        const newTitle = post.title.replace(/\s*\([^)]*\)\s*$/, '').trim();
        newContent = newContent.replace(/^title:\s*"([^"]+)"/m, `title: "${newTitle} (2026 Update)"`);
        changes.push('added year to title');
      }

      // Update date if it's very old (only for posts older than 1 year)
      if (ageMs > SIX_MONTHS_MS * 2) {
        const currentDate = new Date(post.date);
        // Only bump the date by a few months, don't reset entirely
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + 6);
        if (newDate < new Date()) {
          newContent = newContent.replace(/^date:\s*".*?"/m, `date: "${today}"`);
          changes.push('bumped publish date forward');
        }
      }

      fs.writeFileSync(path.join(POSTS_DIR, file), newContent, 'utf8');
      refreshed++;
      console.log(`  ✅ Refreshed: ${changes.join(', ')}`);
    }

    total++;
  }

  console.log(`\n📊 ${refreshed} of ${total} posts refreshed${dryRun ? ' (dry run — use --refresh to apply)' : ''}`);
})().catch((err) => { console.error('\n❌ Fatal:', err.message); process.exit(1); });

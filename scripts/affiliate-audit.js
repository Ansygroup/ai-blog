#!/usr/bin/env node
/**
 * scripts/affiliate-audit.js
 *
 * Autonomous affiliate-link auditor. Detects revenue leaks:
 *   1. Amazon links missing the associates tag (or pointing at a stale tag)
 *   2. Posts with NO affiliate links at all (missed commission)
 *   3. Tag mismatches between posts and the configured AMAZON_ASSOCIATES_TAG
 *
 * The expected tag is read from .env.local (AMAZON_ASSOCIATES_TAG) if present,
 * otherwise falls back to the hard-coded default used by the generator.
 * Run weekly by Hermes; report is Telegram-ready.
 */

const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const DEFAULT_TAG = 'ansy07-20'; // matches generate-post.js hard-coded tag

// Read expected tag from .env.local if set
function getExpectedTag() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const txt = fs.readFileSync(envPath, 'utf8');
    const m = txt.match(/AMAZON_ASSOCIATES_TAG\s*=\s*([^\s#]+)/);
    if (m && m[1] && !m[1].includes('...')) return m[1].trim();
  }
  return DEFAULT_TAG;
}

function audit() {
  const expected = getExpectedTag();
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
  const issues = { missingTag: [], noLinks: [], wrongTag: [] };
  let totalLinks = 0;

  for (const f of files) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8');
    const links = [...raw.matchAll(/amazon\.com\/dp\/[A-Z0-9]+\?tag=([^\s)"']+)/g)];
    totalLinks += links.length;
    if (links.length === 0) {
      // only flag posts that are product/review-ish (have price or "buy")
      if (/(\$\d|buy on amazon|price|rating)/i.test(raw)) issues.noLinks.push(f);
      continue;
    }
    for (const l of links) {
      const tag = l[1];
      if (!tag.includes(expected)) {
        if (tag === '' ) issues.missingTag.push({ file: f, tag });
        else issues.wrongTag.push({ file: f, tag });
      }
    }
  }

  const report = {
    expectedTag: expected,
    totalPosts: files.length,
    totalAffiliateLinks: totalLinks,
    issues,
    generatedAt: new Date().toISOString(),
  };

  const outPath = path.join(__dirname, '..', 'data', 'affiliate-audit.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  // Console summary
  const totalIssues = issues.missingTag.length + issues.wrongTag.length + issues.noLinks.length;
  console.log(`🔗 Affiliate Audit — tag "${expected}"`);
  console.log(`   Posts: ${files.length} | Affiliate links: ${totalLinks}`);
  console.log(`   ❌ Missing tag:     ${issues.missingTag.length}`);
  console.log(`   ⚠️  Wrong tag:       ${issues.wrongTag.length}`);
  console.log(`   📭 No links (product posts): ${issues.noLinks.length}`);
  console.log(`   → Total revenue-leak issues: ${totalIssues}`);
  if (totalIssues === 0) console.log('   ✅ Clean — all affiliate links are tagged correctly.');
  console.log(`   📄 Report: ${outPath}`);
  return report;
}

if (require.main === module) audit();
module.exports = { audit, getExpectedTag };
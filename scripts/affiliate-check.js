#!/usr/bin/env node
/*
 * scripts/affiliate-check.js
 *
 * Scans every post in content/posts for Amazon affiliate links and verifies
 * each one carries the correct tracking tag. Reports (and optionally fixes)
 * any link missing/using the wrong tag. Also flags posts whose frontmatter
 * fails to parse (a content bug worth surfacing).
 *
 * Usage:
 *   node scripts/affiliate-check.js              # report only (default)
 *   node scripts/affiliate-check.js --fix        # rewrite links with correct tag
 *   node scripts/affiliate-check.js --tag XYZ    # override expected tag (default ansy07-20)
 *
 * Exit code: 0 if clean (or after a successful --fix run), 1 if violations found.
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const EXPECTED_TAG = process.argv.includes('--tag')
  ? process.argv[process.argv.indexOf('--tag') + 1]
  : 'ansy07-20';
const FIX = process.argv.includes('--fix');

const AMAZON_RE = /https?:\/\/(www\.)?amazon\.[a-z.]+\/[^\s)"'>]+/gi;

// Scan raw text so a broken frontmatter can't crash the whole run.
function findLinks(raw) {
  return raw.match(AMAZON_RE) || [];
}

function normalizeTag(link) {
  const [base, query] = link.split('?');
  const params = new URLSearchParams(query || '');
  if (params.get('tag') === EXPECTED_TAG) return { link, ok: true };
  const hadTag = params.has('tag');
  params.set('tag', EXPECTED_TAG);
  return { link: `${base}?${params.toString()}`, ok: false, hadTag };
}

function main() {
  const files = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith('.mdx') || f.endsWith('.md'));

  let total = 0;
  let bad = 0;
  let fixed = 0;
  const violations = [];
  const brokenFm = [];

  for (const file of files) {
    const full = path.join(POSTS_DIR, file);
    const raw = fs.readFileSync(full, 'utf8');

    // Detect frontmatter parse failures (content bug, not an affiliate issue).
    let body = raw;
    try {
      const { content } = matter(raw);
      body = content;
    } catch (e) {
      brokenFm.push({ file, error: e.message.split('\n')[0] });
      // still scan the whole raw file for amazon links below
    }

    const links = findLinks(raw); // scan raw so we never miss a link
    if (!links.length) continue;

    for (const link of links) {
      total++;
      const { link: fixedLink, ok, hadTag } = normalizeTag(link);
      if (!ok) {
        bad++;
        violations.push({
          file,
          link,
          reason: hadTag ? `wrong tag (expected ${EXPECTED_TAG})` : 'missing tag',
        });
        if (FIX) {
          const updated = raw.split(link).join(fixedLink);
          fs.writeFileSync(full, updated);
          fixed++;
        }
      }
    }
  }

  console.log(`\n=== Amazon Affiliate Link Audit ===`);
  console.log(`Expected tag : ${EXPECTED_TAG}`);
  console.log(`Posts scanned : ${files.length}`);
  console.log(`Links found   : ${total}`);
  console.log(`Clean links   : ${total - bad}`);
  console.log(`Violations    : ${bad}`);

  if (brokenFm.length) {
    console.log(`\n-- Broken frontmatter (content bug, ${brokenFm.length}) --`);
    brokenFm.slice(0, 20).forEach((b) =>
      console.log(`  ${b.file} → ${b.error}`)
    );
  }

  if (violations.length) {
    console.log(`\n-- Violations (first 20) --`);
    violations.slice(0, 20).forEach((v) =>
      console.log(`  [${v.reason}] ${v.file}\n     ${v.link}`)
    );
  }

  if (FIX) {
    console.log(`\n--fix applied: ${fixed} link(s) rewritten across posts.`);
  } else if (bad) {
    console.log(`\nRun with --fix to rewrite the ${bad} link(s) with ${EXPECTED_TAG}.`);
  }

  process.exit(bad && !FIX ? 1 : 0);
}

main();

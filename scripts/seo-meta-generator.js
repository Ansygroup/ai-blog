#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const args = process.argv.slice(2);
const fixMode = args.includes('--fix');
const slugFilter = args.find(a => !a.startsWith('--'));

function getPosts() {
  let files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
  if (slugFilter) files = files.filter(f => f.replace('.mdx', '') === slugFilter);
  return files.map(f => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8').replace(/\r\n/g, '\n');
    const slug = f.replace(/\.mdx$/, '');
    const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) return null;
    const fm = {};
    let excerpt = '', seoTitle = '', seoScore = '0';
    match[1].split('\n').forEach(line => {
      const sep = line.indexOf(':');
      if (sep === -1) return;
      const key = line.slice(0, sep).trim();
      let val = line.slice(sep + 1).trim().replace(/^['"](.*)['"]$/, '$1');
      fm[key] = val;
      if (key === 'excerpt') excerpt = val;
      if (key === 'seoTitle') seoTitle = val;
      if (key === 'seoScore') seoScore = val;
    });
    const body = match[2].trim();
    return {
      slug, title: fm.title || slug,
      excerpt, seoTitle, seoScore: parseInt(seoScore) || 0,
      wordCount: body.split(/\s+/).length,
      hasYear: /\b2026\b/.test(fm.title || ''),
      date: fm.date || '',
      category: fm.category || '',
    };
  }).filter(Boolean);
}

function analyzeMeta(post) {
  const issues = [];
  if (!post.excerpt || post.excerpt.length < 50) issues.push('excerpt-too-short');
  else if (post.excerpt.length > 165) issues.push('excerpt-too-long');
  if (!post.hasYear && new Date().getFullYear() === 2026) issues.push('missing-year');
  if (post.title.length > 70) issues.push('title-too-long');
  if (post.title.length < 20) issues.push('title-too-short');
  return issues;
}

function generateMeta(post) {
  const year = '2026';
  let newTitle = post.title;
  let newExcerpt = post.excerpt;

  // Add year if missing
  if (!post.hasYear && !post.title.includes(year)) {
    newTitle = post.title.replace(/(\d{4})/, year);
    if (newTitle === post.title) {
      // Try appending
      newTitle = post.title.endsWith('?') || post.title.endsWith('!') ? post.title.slice(0, -1) + ` (${year})` : `${post.title} (${year})`;
    }
  }

  // Generate excerpt if missing or too short
  if (!newExcerpt || newExcerpt.length < 50) {
    newExcerpt = `Discover the best ${post.title.toLowerCase()} in ${year}. Compare features, pricing, and performance to find the perfect solution for your needs.`;
  }

  // Fix long excerpts
  if (newExcerpt.length > 165) {
    newExcerpt = newExcerpt.slice(0, 162).trim().replace(/\s+\S*$/, '') + '...';
  }

  return { newTitle, newExcerpt, changed: newTitle !== post.title || newExcerpt !== post.excerpt };
}

function updateFile(slug, newTitle, newExcerpt) {
  const filePath = path.join(POSTS_DIR, `${slug}.mdx`);
  let raw = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Update title (only if year was added)
  if (newTitle) {
    const titleRegex = /^title:\s*".*"/m;
    if (titleRegex.test(raw)) {
      raw = raw.replace(titleRegex, `title: "${newTitle}"`);
      modified = true;
    }
  }

  // Update or add excerpt
  if (newExcerpt) {
    const excerptRegex = /^excerpt:\s*".*"/m;
    if (excerptRegex.test(raw)) {
      raw = raw.replace(excerptRegex, `excerpt: "${newExcerpt}"`);
      modified = true;
    } else {
      // Add excerpt after title
      raw = raw.replace(/^(title:.*)$/m, `$1\nexcerpt: "${newExcerpt}"`);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, raw, 'utf8');
    return true;
  }
  return false;
}

// --- Main ---
const posts = getPosts();
console.log(`\n📊 SEO Meta Analysis: ${posts.length} posts\n`);

let totalIssues = 0;
let fixed = 0;
const results = [];

posts.forEach(post => {
  const issues = analyzeMeta(post);
  if (issues.length === 0) return;
  totalIssues += issues.length;

  const meta = generateMeta(post);
  const applied = fixMode && meta.changed ? updateFile(post.slug, meta.newTitle, meta.newExcerpt) : false;
  if (applied) fixed++;

  console.log(`  ${post.slug}`);
  console.log(`    Title: ${post.title}`);
  console.log(`    Issues: ${issues.join(', ')}`);
  if (meta.changed) {
    console.log(`    → Title: ${post.title} ➜ ${meta.newTitle}`);
    console.log(`    → Excerpt: ${(post.excerpt || '(none)').slice(0, 60)} ➜ ${meta.newExcerpt.slice(0, 60)}`);
    if (applied) console.log('    ✅ Applied');
  }
  console.log('');

  results.push({
    slug: post.slug,
    title: post.title,
    issues,
    suggestion: meta.changed ? { title: meta.newTitle, excerpt: meta.newExcerpt } : null,
    applied,
  });
});

console.log(`\n${'='.repeat(40)}`);
console.log(`📊 Results: ${posts.length} posts, ${totalIssues} issues`);
if (fixMode) console.log(`✅ Fixed: ${fixed} post(s)`);
console.log('');

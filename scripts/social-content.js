#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const SOCIAL_DIR = path.join(__dirname, '..', 'public', 'social');
if (!fs.existsSync(SOCIAL_DIR)) fs.mkdirSync(SOCIAL_DIR, { recursive: true });

const args = process.argv.slice(2);
const fileArg = args.find(a => !a.startsWith('--'));
const allPosts = args.includes('--all');

function getNewPosts() {
  if (fileArg && fs.existsSync(fileArg)) {
    return [fileArg];
  }
  if (allPosts) {
    return fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx')).sort().slice(-10).map(f => path.join(POSTS_DIR, f));
  }
  return [];
}

(async () => {
  const files = getNewPosts();
  if (files.length === 0) {
    console.log('No posts specified. Usage: node scripts/social-content.js <file> [--all]');
    process.exit(0);
  }

  const posts = files.map(f => {
    const c = fs.readFileSync(f, 'utf8');
    const get = (k) => (c.match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm')) || [])[1] || '';
    return { file: f, slug: path.basename(f, '.mdx'), title: get('title'), excerpt: get('excerpt') };
  }).filter(p => p.title);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ai-blog-ten-steel.vercel.app';
  const lines = [];

  for (const p of posts) {
    const url = `${siteUrl}/posts/${p.slug}`;
    const shortTitle = p.title.length > 60 ? p.title.slice(0, 57) + '...' : p.title;
    const shortExcerpt = (p.excerpt || shortTitle).length > 100 ? (p.excerpt || shortTitle).slice(0, 97) + '...' : (p.excerpt || shortTitle);

    lines.push('=== Social Posts ===');
    lines.push(`Post: ${p.title}`);
    lines.push(`URL: ${url}`);
    lines.push('');
    lines.push('--- Twitter (2-3 tweets) ---');
    lines.push(`1. ${shortTitle} ${url}`);
    lines.push(`2. ${shortExcerpt} Read more: ${url}`);
    lines.push(`3. New: ${shortTitle} — our hands-on review → ${url}`);
    lines.push('');
    lines.push('--- LinkedIn ---');
    lines.push(`${shortTitle}`);
    lines.push('');
    lines.push(`${shortExcerpt}`);
    lines.push('');
    lines.push(`Read the full review: ${url}`);
    lines.push('#AITools #TechReviews #AI');
    lines.push('');
    lines.push('--- Facebook ---');
    lines.push(`📝 ${shortTitle}`);
    lines.push(`${shortExcerpt}`);
    lines.push(`🔗 ${url}`);
    lines.push('');
    lines.push('------------------------');
    lines.push('');
  }

  const outputPath = path.join(SOCIAL_DIR, `social-${Date.now()}.txt`);
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
  console.log(`✅ Social content saved: ${outputPath}`);
  console.log(`   ${posts.length} post(s) processed`);
})();

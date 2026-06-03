#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const DIGESTS_DIR = path.join(__dirname, '..', 'public', 'digests');
if (!fs.existsSync(DIGESTS_DIR)) fs.mkdirSync(DIGESTS_DIR, { recursive: true });

function getPosts() {
  return fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx')).map(f => {
    const c = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8');
    const get = (k) => (c.match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm')) || [])[1] || '';
    return { slug: f.replace(/\.mdx$/, ''), title: get('title'), excerpt: get('excerpt'), date: get('date'), category: get('category') };
  }).filter(p => p.title && p.date);
}

(async () => {
  const posts = getPosts();
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekly = posts.filter(p => {
    const d = new Date(p.date);
    return !isNaN(d) && d.getTime() > oneWeekAgo;
  });

  if (weekly.length === 0) {
    console.log('No new posts this week — skipping newsletter.');
    process.exit(0);
  }

  const lines = [];
  lines.push('# AI Pulse Daily — Weekly Digest');
  lines.push('');
  lines.push(`Week of ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`## This Week's Top Stories (${weekly.length} new articles)`);
  lines.push('');

  for (const p of weekly) {
    const url = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://ai-blog-ten-steel.vercel.app'}/posts/${p.slug}`;
    lines.push(`### [${p.title}](${url})`);
    if (p.excerpt) lines.push(`> ${p.excerpt}`);
    lines.push(`*${p.category || 'Article'} · ${new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}*`);
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('*AI Pulse Daily — Honest AI reviews, comparisons, and tutorials.*');
  lines.push(`*[Visit our site](${process.env.NEXT_PUBLIC_SITE_URL || 'https://ai-blog-ten-steel.vercel.app'})*`);

  const dateStr = new Date().toISOString().split('T')[0];
  const filePath = path.join(DIGESTS_DIR, `weekly-${dateStr}.md`);
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log(`✅ Newsletter saved: ${filePath}`);
  console.log(`   ${weekly.length} articles included`);
})();

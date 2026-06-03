#!/usr/bin/env node
/**
 * scripts/auto-internal-link.js
 *
 * Scans all posts for mentions of topics covered by other posts and adds
 * contextual internal links where missing. Idempotent — won't duplicate links.
 *
 * Usage:
 *   node scripts/auto-internal-link.js            # scan + add links
 *   node scripts/auto-internal-link.js --dry-run  # preview only
 *
 * Run after every new post generation, or as a weekly cron job.
 */
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com';

function getAllPosts() {
  return fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.mdx')).map((f) => {
    const c = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8');
    const slug = f.replace(/\.mdx?$/, '');
    const title = (c.match(/^title:\s*"([^"]+)"/m) || [])[1] || slug;
    const tags = (c.match(/^tags:\s*\[([^\]]+)\]/m) || [])[1]?.split(',').map((t) => t.trim().replace(/['"]/g, '').toLowerCase()) || [];
    const category = (c.match(/^category:\s*"?([^"\n]+)"?/m) || [])[1] || '';
    const body = c.match(/^---\n[\s\S]+?\n---\n([\s\S]+)$/)?.[1] || '';
    const words = new Set();
    // Extract compound phrases (2-3 word n-grams) from title first
    const titleParts = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 2);
    // Bigrams from title
    for (let i = 0; i < titleParts.length - 1; i++) {
      words.add(titleParts[i] + ' ' + titleParts[i + 1]);
    }
    // Trigrams from title
    for (let i = 0; i < titleParts.length - 2; i++) {
      words.add(titleParts[i] + ' ' + titleParts[i + 1] + ' ' + titleParts[i + 2]);
    }
    // Also individual words (length > 3)
    titleParts.filter((w) => w.length > 3).forEach((w) => words.add(w));
    // Extract key phrases from tags
    tags.forEach((t) => t.split(/\s+/).filter((w) => w.length > 3).forEach((w) => words.add(w)));
    // Category as a keyword
    if (category) words.add(category.toLowerCase());
    return { slug, title, tags, category, body, keywords: [...words] };
  });
}

// Build a topic map: keyword -> post slugs (excluding too-common words)
function buildTopicMap(posts) {
  const stopWords = new Set([
    'ai', 'tools', 'tool', 'review', 'best', '2026', '2025', 'guide', 'use', 'using',
    'how', 'what', 'why', 'when', 'where', 'this', 'that', 'with', 'from',
    'for', 'and', 'the', 'are', 'can', 'make', 'made', 'get', 'your', 'their',
    'all', 'top', 'here', 'real', 'save', 'free', 'new', 'our', 'has', 'its',
    'not', 'but', 'out', 'now', 'than', 'was', 'been', 'some', 'very', 'just',
    'also', 'over', 'more', 'most', 'much', 'each', 'such', 'which', 'will',
    'would', 'could', 'should', 'after', 'before', 'into', 'other', 'only',
    'about', 'above', 'down', 'still', 'three', 'months', 'test', 'pricing',
    'without', 'compared', 'through', 'generator', 'while', 'during',
    'tools for', 'and the', 'for the', 'top tools', 'for small', 'for marketers',
    'use chatgpt', 'chatgpt for', 'best free',
  ]);
  const map = {};
  for (const p of posts) {
    for (const kw of p.keywords) {
      if (stopWords.has(kw) || kw.length < 4) continue;
      if (!map[kw]) map[kw] = [];
      map[kw].push(p.slug);
    }
  }
  return map;
}

const dryRun = process.argv.includes('--dry-run');
const posts = getAllPosts();
const topicMap = buildTopicMap(posts);
let totalLinksAdded = 0;
let totalLinksSkipped = 0;

console.log(`🔗 Auto internal linker — ${posts.length} posts, ${Object.keys(topicMap).length} keywords\n`);

for (const post of posts) {
  const filePath = path.join(POSTS_DIR, `${post.slug}.mdx`);
  let content = fs.readFileSync(filePath, 'utf8');
  let body = content.match(/^---\n[\s\S]+?\n---\n([\s\S]+)$/)?.[1];
  if (!body) continue;
  let modified = false;

  // Find mentions of other posts' topics in this post's body
  const mentions = [];
  const bodyLower = body.toLowerCase();

  for (const [kw, relatedSlugs] of Object.entries(topicMap)) {
    if (post.keywords.includes(kw)) continue; // skip self-references
    // Find where this keyword appears
    let idx = 0;
    while ((idx = bodyLower.indexOf(kw, idx)) !== -1) {
      // Check it's a word boundary (not part of a longer word)
      const before = idx > 0 ? bodyLower[idx - 1] : ' ';
      const after = idx + kw.length < bodyLower.length ? bodyLower[idx + kw.length] : ' ';
      if (/[a-z0-9]/.test(before) || /[a-z0-9]/.test(after)) {
        idx += kw.length;
        continue;
      }
      // Check it's not already linked
      const beforeSlice = body.slice(Math.max(0, idx - 50), idx);
      if (/href=["']/.test(beforeSlice) || /\]\(/.test(beforeSlice)) {
        idx += kw.length;
        totalLinksSkipped++;
        continue;
      }
      // Check context — only link if it's in prose (not in code blocks, frontmatter, etc.)
      const contextBefore = body.slice(Math.max(0, idx - 200), idx);
      if (contextBefore.includes('```') || contextBefore.includes('---')) {
        idx += kw.length;
        continue;
      }
      // Pick the best matching slug — keyword must appear in target's title
      for (const slug of relatedSlugs) {
        if (slug === post.slug) continue;
        const target = posts.find((p) => p.slug === slug);
        if (!target) continue;
        // Only link if the keyword phrase appears in target's title (semantic relevance)
        const titleLower = target.title.toLowerCase();
        if (!titleLower.includes(kw.toLowerCase())) continue;
        // Check this slug isn't already linked nearby
        const around = body.slice(Math.max(0, idx - 100), idx + kw.length + 100);
        if (around.includes(`/posts/${slug}`)) {
          totalLinksSkipped++;
          continue;
        }
        mentions.push({ idx, kw, slug, title: target.title });
        break; // one link per mention
      }
      idx += kw.length;
    }
  }

  // Deduplicate: only keep the first mention of each slug
  const seen = new Set();
  const uniqueMentions = mentions.filter((m) => {
    if (seen.has(m.slug)) return false;
    seen.add(m.slug);
    return true;
  });

  // Apply links (in reverse order to preserve indices)
  uniqueMentions.sort((a, b) => b.idx - a.idx);
  for (const m of uniqueMentions) {
    const linkText = body.slice(m.idx, m.idx + m.kw.length);
    const replacement = `[${linkText}](/posts/${m.slug})`;
    body = body.slice(0, m.idx) + replacement + body.slice(m.idx + m.kw.length);
    modified = true;
    totalLinksAdded++;
    console.log(`  🔗 "${post.title}" → "${m.title}" (via "${m.kw}")`);
  }

  if (modified) {
    content = content.replace(/^---\n[\s\S]+?\n---\n([\s\S]+)$/, (_, _body) => {
      return content.slice(0, content.indexOf(_body)) + body;
    });
    if (dryRun) {
      console.log(`  📝 would update: ${post.slug}.mdx (${uniqueMentions.length} links)\n`);
    } else {
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }
}

console.log(`\n📊 Results: ${totalLinksAdded} links added, ${totalLinksSkipped} skipped${dryRun ? ' (dry run)' : ''}`);

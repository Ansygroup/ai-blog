#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { groqJson, hasGroqKey } = require('./ai-agent');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ai-blog-ten-steel.vercel.app';

const useAI = process.argv.includes('--ai');
const dryRun = process.argv.includes('--dry-run');

function getAllPosts() {
  return fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.mdx')).map((f) => {
    const c = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8');
    const slug = f.replace(/\.mdx?$/, '');
    const title = (c.match(/^title:\s*"([^"]+)"/m) || [])[1] || slug;
    const tags = (c.match(/^tags:\s*\[([^\]]+)\]/m) || [])[1]?.split(',').map((t) => t.trim().replace(/['"]/g, '').toLowerCase()) || [];
    const category = (c.match(/^category:\s*"?([^"\n]+)"?/m) || [])[1] || '';
    const body = c.match(/^---\r?\n[\s\S]+?\r?\n---\r?\n([\s\S]+)$/)?.[1] || '';
    const words = new Set();
    const titleParts = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 2);
    for (let i = 0; i < titleParts.length - 1; i++) words.add(titleParts[i] + ' ' + titleParts[i + 1]);
    for (let i = 0; i < titleParts.length - 2; i++) words.add(titleParts[i] + ' ' + titleParts[i + 1] + ' ' + titleParts[i + 2]);
    titleParts.filter((w) => w.length > 3).forEach((w) => words.add(w));
    tags.forEach((t) => t.split(/\s+/).filter((w) => w.length > 3).forEach((w) => words.add(w)));
    if (category) words.add(category.toLowerCase());
    return { slug, title, tags, category, body, keywords: [...words] };
  });
}

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

function isAlreadyLinked(body, idx, kw, slug) {
  const beforeSlice = body.slice(Math.max(0, idx - 50), idx);
  const afterSlice = body.slice(idx + kw.length, Math.min(body.length, idx + kw.length + 50));
  if (/href=["']/.test(beforeSlice) || /\]\(/.test(beforeSlice) || /\]\(/.test(afterSlice)) return true;
  const rawText = body.slice(idx, idx + kw.length);
  if (/[[\]()]/.test(rawText)) return true;
  if (idx > 0 && body[idx - 1] === '[') return true;
  const around = body.slice(Math.max(0, idx - 100), idx + kw.length + 100);
  if (around.includes(`/posts/${slug}`)) return true;
  return false;
}

async function getAiLinkSuggestions(post, allPosts) {
  const postsList = allPosts.filter(p => p.slug !== post.slug).map(p => `- "${p.title}" (slug: ${p.slug})`).join('\n');
  const bodySample = post.body.slice(0, 3000);
  const prompt = `You are an internal linking assistant. Given this blog post body and a list of other posts, suggest 3-5 natural internal links.

Current post title: "${post.title}"

Other posts:
${postsList}

Post body (first 3000 chars):
${bodySample}

For each suggestion, find an exact phrase in the body that could be linked to a relevant post. Return JSON array:
[
  {
    "phrase": "exact text from body to link",
    "slug": "target-post-slug",
    "reason": "why this link makes sense"
  }
]

Only suggest links where the phrase appears verbatim in the body. Use exact capitalization as it appears.`;

  return groqJson(prompt, { temperature: 0.3, maxTokens: 2048 });
}

async function runAiMode(posts) {
  console.log(`🤖 AI mode — Groq-powered semantic linking\n`);
  let totalAdded = 0;
  let totalFailed = 0;

  for (const post of posts) {
    const filePath = path.join(POSTS_DIR, `${post.slug}.mdx`);
    let content = fs.readFileSync(filePath, 'utf8');
    let body = content.match(/^---\r?\n[\s\S]+?\r?\n---\r?\n([\s\S]+)$/)?.[1];
    if (!body) continue;

    const suggestions = await getAiLinkSuggestions(post, posts);
    if (!suggestions || !Array.isArray(suggestions)) {
      totalFailed++;
      continue;
    }

    let modified = false;
    const applied = [];

    for (const s of suggestions) {
      if (!s.phrase || !s.slug) continue;
      const idx = body.indexOf(s.phrase);
      if (idx === -1) continue;
      if (isAlreadyLinked(body, idx, s.phrase, s.slug)) continue;
      const target = posts.find(p => p.slug === s.slug);
      if (!target) continue;

      const replacement = `[${s.phrase}](/posts/${s.slug})`;
      body = body.slice(0, idx) + replacement + body.slice(idx + s.phrase.length);
      modified = true;
      totalAdded++;
      applied.push(s);
      console.log(`  🔗 "${post.title}" → "${target.title}" (AI: ${s.reason || 'semantic match'})`);
    }

    if (modified) {
      content = content.replace(/^---\r?\n[\s\S]+?\r?\n---\r?\n([\s\S]+)$/, (_, _body) => {
        return content.slice(0, content.indexOf(_body)) + body;
      });
      if (dryRun) {
        console.log(`  📝 would update: ${post.slug}.mdx (${applied.length} links)\n`);
      } else {
        fs.writeFileSync(filePath, content, 'utf8');
      }
    }
  }

  console.log(`\n📊 AI Results: ${totalAdded} links added, ${totalFailed} posts skipped (no AI response)`);
}

async function runRuleMode(posts) {
  const topicMap = buildTopicMap(posts);
  let totalLinksAdded = 0;
  let totalLinksSkipped = 0;

  for (const post of posts) {
    const filePath = path.join(POSTS_DIR, `${post.slug}.mdx`);
    let content = fs.readFileSync(filePath, 'utf8');
    let body = content.match(/^---\r?\n[\s\S]+?\r?\n---\r?\n([\s\S]+)$/)?.[1];
    if (!body) continue;
    let modified = false;

    const mentions = [];
    const bodyLower = body.toLowerCase();

    for (const [kw, relatedSlugs] of Object.entries(topicMap)) {
      if (post.keywords.includes(kw)) continue;
      let idx = 0;
      while ((idx = bodyLower.indexOf(kw, idx)) !== -1) {
        const before = idx > 0 ? bodyLower[idx - 1] : ' ';
        const after = idx + kw.length < bodyLower.length ? bodyLower[idx + kw.length] : ' ';
        if (/[a-z0-9]/.test(before) || /[a-z0-9]/.test(after)) { idx += kw.length; continue; }
        if (isAlreadyLinked(body, idx, kw, '')) { idx += kw.length; totalLinksSkipped++; continue; }
        const contextBefore = body.slice(Math.max(0, idx - 200), idx);
        if (contextBefore.includes('```') || contextBefore.includes('---')) { idx += kw.length; continue; }
        for (const slug of relatedSlugs) {
          if (slug === post.slug) continue;
          const target = posts.find((p) => p.slug === slug);
          if (!target) continue;
          if (!target.title.toLowerCase().includes(kw.toLowerCase())) continue;
          if (isAlreadyLinked(body, idx, kw, slug)) { totalLinksSkipped++; continue; }
          mentions.push({ idx, kw, slug, title: target.title });
          break;
        }
        idx += kw.length;
      }
    }

    const seen = new Set();
    const uniqueMentions = mentions.filter((m) => {
      if (seen.has(m.slug)) return false;
      seen.add(m.slug);
      return true;
    });

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
      content = content.replace(/^---\r?\n[\s\S]+?\r?\n---\r?\n([\s\S]+)$/, (_, _body) => {
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
}

(async () => {
  const posts = getAllPosts();
  if (useAI && hasGroqKey()) {
    await runAiMode(posts);
  } else if (useAI && !hasGroqKey()) {
    console.log('⚠️ --ai flag used but no GROQ_API_KEY found. Falling back to rule-based linking.\n');
    await runRuleMode(posts);
  } else {
    console.log(`🔗 Auto internal linker — ${posts.length} posts\n`);
    await runRuleMode(posts);
  }
})();

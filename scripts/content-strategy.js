#!/usr/bin/env node
/**
 * scripts/content-strategy.js
 *
 * AI-powered content strategy agent. Analyzes your existing content to find
 * gaps, generate new topic ideas, and auto-expand the keyword queue.
 *
 * Usage:
 *   node scripts/content-strategy.js                  # analyze + suggest
 *   node scripts/content-strategy.js --fill-queue     # auto-add to queue
 *   node scripts/content-strategy.js --analyze-only   # just show report
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const QUEUE_PATH = path.join(__dirname, 'keyword-queue.json');

// ---- Data extraction ----
function getAllPostData() {
  return fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.mdx')).map((f) => {
    const c = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8');
    const slug = f.replace(/\.mdx?$/, '');
    const get = (k) => (c.match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm')) || [])[1] || '';
    const title = get('title');
    const excerpt = get('excerpt');
    const category = get('category');
    const date = get('date');
    const tags = (c.match(/^tags:\s*\[([^\]]+)\]/m) || [])[1]?.split(',').map((t) => t.trim().replace(/['"]/g, '')) || [];
    const body = c.match(/^---\n[\s\S]+?\n---\n([\s\S]+)$/)?.[1] || '';
    const wordCount = body.trim().split(/\s+/).length;
    const h2s = (body.match(/^## /gm) || []).length;
    return { slug, title, excerpt, category, date, tags, wordCount, h2s, hasFaq: body.includes('## FAQ') };
  });
}

function getQueue() {
  if (!fs.existsSync(QUEUE_PATH)) return [];
  return JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
}

// ---- Analysis ----
function analyzeContent(posts) {
  const report = [];
  const cats = {};
  const allTags = {};

  for (const p of posts) {
    cats[p.category] = (cats[p.category] || 0) + 1;
    p.tags.forEach((t) => { allTags[t] = (allTags[t] || 0) + 1; });
  }

  // Category coverage analysis
  const idealPerCategory = Math.ceil(posts.length / Math.max(1, Object.keys(cats).length));
  report.push('📊 **Category Coverage:**');
  for (const [cat, count] of Object.entries(cats).sort((a, b) => b[1] - a[1])) {
    const status = count >= idealPerCategory ? '✅' : '⚠️';
    report.push(`  ${status} ${cat}: ${count} posts (target: ${idealPerCategory})`);
  }

  // Content gaps: categories with few posts
  report.push('\n🔍 **Content Gaps (Underserved Categories):**');
  for (const [cat, count] of Object.entries(cats).sort((a, b) => a[1] - b[1])) {
    if (count < idealPerCategory * 0.6) {
      report.push(`  ⚠️ "${cat}" has only ${count} post(s) — needs more depth`);
    }
  }

  // Quality checks
  report.push('\n📝 **Quality Checks:**');
  let qualityIssues = 0;
  for (const p of posts) {
    if (!p.hasFaq) { report.push(`  ⚠️ "${p.title}" — missing FAQ section (GEO opportunity)`); qualityIssues++; }
    if (p.wordCount < 1000) { report.push(`  ⚠️ "${p.title}" — thin content (${p.wordCount} words)`); qualityIssues++; }
    if (p.h2s < 4) { report.push(`  ⚠️ "${p.title}" — only ${p.h2s} H2 headings`); qualityIssues++; }
  }
  if (qualityIssues === 0) report.push('  ✅ All posts pass quality checks');

  // Tag analysis
  const usedTags = Object.keys(allTags);
  report.push(`\n🏷️ **Tags Used:** ${usedTags.length} unique tags across ${posts.length} posts`);

  // Last updated check
  const oldPosts = posts.filter((p) => {
    const d = new Date(p.date);
    const monthsAgo = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return monthsAgo > 6;
  });
  if (oldPosts.length > 0) {
    report.push(`\n🕰️ **Stale Content (>6 months old):** ${oldPosts.length} posts`);
    oldPosts.forEach((p) => report.push(`  ⏳ "${p.title}" (${p.date})`));
  }

  return report.join('\n');
}

// ---- AI Suggestion Generator ----
async function generateSuggestions(posts, queue) {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('  ℹ️  No AI API key found — using rule-based suggestions only\n');
    return fallbackSuggestions(posts, queue);
  }

  const provider = process.env.GROQ_API_KEY ? 'groq' : process.env.OPENAI_API_KEY ? 'openai' : 'gemini';
  const existingTopics = posts.map((p) => p.title);
  const queuedTopics = queue.map((q) => q.topic);

  const prompt = `You are a content strategy expert for an AI tools review blog.

EXISTING POSTS (${posts.length} total):
${existingTopics.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}

CURRENT QUEUE (${queuedTopics.length} topics):
${queuedTopics.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}

Analyze the gaps and suggest 8-12 NEW high-intent AI niche topics that:
1. Are NOT already covered by existing posts or in the queue
2. Have high search volume potential (keyword research-backed)
3. Cover underserved angles, comparisons, or tutorials
4. Are specific, not generic (e.g., "How to use AI for Instagram Reel scripts" not "AI for social media")
5. Include a category (Reviews, Comparisons, Tutorials, Best Of) and 3-5 keywords each

Return ONLY a JSON array of objects, each with: topic, category, keywords[]

Format:
[{"topic": "...", "category": "...", "keywords": ["..."]}]`;

  try {
    let suggestions = await queryAI(provider, apiKey, prompt);
    suggestions = JSON.parse(suggestions);
    if (!Array.isArray(suggestions)) throw new Error('Invalid response format');
    return suggestions.slice(0, 12);
  } catch (err) {
    console.log(`  ⚠️ AI suggestion failed: ${err.message}`);
    console.log('  ℹ️  Using fallback suggestions\n');
    return fallbackSuggestions(posts, queue);
  }
}

async function queryAI(provider, apiKey, prompt) {
  if (provider === 'groq') {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [
        { role: 'system', content: 'You are a content strategy expert. Return ONLY valid JSON.' },
        { role: 'user', content: prompt },
      ], temperature: 0.7, max_tokens: 2000 }),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  }
  if (provider === 'openai') {
    const OpenAI = require('openai').default || require('openai');
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a content strategy expert. Return ONLY valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7, max_tokens: 2000,
    });
    return completion.choices[0].message.content.trim();
  }
  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2000 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  }
  throw new Error('No valid provider');
}

function fallbackSuggestions(posts, queue) {
  const existingTopics = new Set(posts.map((p) => p.title.toLowerCase()));
  const queuedTopics = new Set(queue.map((q) => q.topic.toLowerCase()));

  const suggestions = [
    { topic: 'best ai tools for video editing 2026', category: 'Best Of', keywords: ['ai video editing', 'video tools', 'descript', 'runway'] },
    { topic: 'best ai tools for podcasters 2026', category: 'Best Of', keywords: ['ai podcast', 'audio editing', 'otter.ai', 'descript'] },
    { topic: 'midjourney vs firefly vs dalle 2026', category: 'Comparisons', keywords: ['midjourney', 'firefly', 'dall-e', 'image gen'] },
    { topic: 'how to use ai for ad copy 2026', category: 'Tutorials', keywords: ['ai ad copy', 'google ads ai', 'facebook ads ai'] },
    { topic: 'how to use ai for seo content clusters 2026', category: 'Tutorials', keywords: ['content clusters', 'seo ai', 'topic clusters'] },
    { topic: 'how to use ai for landing pages 2026', category: 'Tutorials', keywords: ['ai landing page', 'copywriting', 'conversion'] },
    { topic: 'ai tools for freelancers 2026', category: 'Best Of', keywords: ['freelance ai', 'productivity ai', 'ai for freelancers'] },
    { topic: 'best ai writing tools for fiction 2026', category: 'Best Of', keywords: ['ai fiction writing', 'creative writing ai', 'novel ai'] },
    { topic: 'how to use ai for market research 2026', category: 'Tutorials', keywords: ['ai market research', 'consumer insights ai', 'market analysis ai'] },
    { topic: 'ai tools for seo agencies 2026', category: 'Reviews', keywords: ['seo agency ai', 'enterprise ai seo', 'surfer seo'] },
  ];

  return suggestions.filter((s) => {
    const t = s.topic.toLowerCase();
    return !existingTopics.has(t) && !queuedTopics.has(t);
  }).slice(0, 8);
}

// ---- Queue Update ----
function addToQueue(suggestions) {
  const queue = getQueue();
  const existingTopics = new Set(queue.map((q) => q.topic.toLowerCase()));
  let added = 0;

  for (const s of suggestions) {
    if (existingTopics.has(s.topic.toLowerCase())) continue;
    queue.push({
      topic: s.topic,
      category: s.category || 'AI Tools',
      keywords: s.keywords || [s.topic],
    });
    added++;
    existingTopics.add(s.topic.toLowerCase());
  }

  fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2), 'utf8');
  return added;
}

// ---- Main ----
(async () => {
  const fillQueue = process.argv.includes('--fill-queue');
  const analyzeOnly = process.argv.includes('--analyze-only');

  console.log('🧠 Content Strategy Agent\n');

  // Phase 1: Analyze
  console.log('📊 Analyzing existing content...');
  const posts = getAllPostData();
  const queue = getQueue();
  const analysis = analyzeContent(posts);
  console.log(analysis);

  // Phase 2: Generate suggestions
  if (!analyzeOnly) {
    console.log('\n💡 Generating topic suggestions...');
    const suggestions = await generateSuggestions(posts, queue);

    if (suggestions.length === 0) {
      console.log('  No new suggestions (queue may already be full)');
    } else {
      console.log(`\n📋 **Suggested New Topics (${suggestions.length}):**`);
      suggestions.forEach((s, i) => {
        console.log(`  ${i + 1}. [${s.category}] ${s.topic}`);
        console.log(`     Keywords: ${(s.keywords || []).join(', ')}`);
      });

      if (fillQueue) {
        const added = addToQueue(suggestions);
        console.log(`\n✅ Added ${added} topics to keyword queue. Queue now has ${getQueue().length} topics.`);
      }
    }
  }

  console.log('\n✅ Content strategy analysis complete.');
})().catch((err) => { console.error('\n❌ Fatal:', err.message); process.exit(1); });

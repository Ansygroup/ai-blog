#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { json, hasKey } = require('./ai-agent');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
// Links MUST be site-relative (`/posts/<slug>`), never absolute.
//
// Why (2026-10-05): this script used to emit
//   BASE_URL + '/posts/' + slug
// i.e. a ~60-90 char absolute URL. On the NEXT run `buildTopicMap()` produced a
// keyword that occurs *inside* that URL text, `body.indexOf(kw)` landed inside
// the URL, and `isAlreadyLinked()` -- which only looked 50 chars back -- did not
// see the `](` opener of such a long URL, so it injected a NEW anchor in the
// middle of the previous URL. Result: unbounded `](url)](url)](url)` glue,
// 206,161 occurrences across 748/750 posts, growing on every CI run.
//
// Two invariants enforce that:
//   1. emit `/posts/<slug>` (short, and the convention the rest of the repo uses)
//   2. `isInsideAnchor()` below refuses any offset that sits inside `[...]` or
//      inside a `](...)` target, whatever its length -- see that function.
// Keep both. Do NOT reintroduce BASE_URL here.

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

// Is offset `idx` inside an existing markdown anchor -- either the visible label
// `[...]` or the target `](...)`? Length is irrelevant: this walks the anchor
// structure instead of using a fixed character window, which is what let the
// previous 50-char `beforeSlice.includes('](')` test miss a 90-char absolute URL
// and splice new links into it.
function isInsideAnchor(body, idx) {
  let inTarget = false;
  for (let i = idx - 1; i >= 0; i--) {
    const ch = body[i];
    if (ch === '\n') return false;       // anchors do not span lines
    if (ch === ']') {
      // a ']' immediately followed by '(' opens a target -- keep scanning back
      // through the target until we reach its '['.
      if (body[i + 1] === '(') { inTarget = true; continue; }
      return true;                        // ']' not followed by '(' ends a label
    }
    if (ch === '[') return true;          // reached the label opener
    if (inTarget && ch === '(') { inTarget = false; continue; }
    if (ch === ']' || ch === ')') { /* keep scanning */ }
  }
  return true;
}

function isAlreadyLinked(body, idx, kw, slug) {
  // Never touch text that belongs to an existing anchor -- that is where the
  // `](url)](url)` glue came from.
  if (isInsideAnchor(body, idx)) return true;

  // An occurrence of `kw` is already linked when EITHER
  //   a) the 50 chars BEFORE it contain a `](` anchor opener, or
  //   b) the text right AFTER it starts an anchor target: `](` or `(`.
  // The old check only tested afterSlice.startsWith('('), so it missed the `](`
  // form that addLink() itself emits. Every re-run therefore re-wrapped the same
  // phrase, growing ](url)](url)](url) chains without bound.
  const beforeSlice = body.slice(Math.max(0, idx - 50), idx);
  const after = body.slice(idx + kw.length, Math.min(body.length, idx + kw.length + 50));
  if (beforeSlice.includes('](')) return true;
  if (after.startsWith('](') || after.startsWith('(')) return true;
  // Same guard expressed structurally: `[phrase](` is already an anchor.
  return body[idx - 1] === '[' && after.startsWith('](');
}

function addLink(body, idx, kw, slug) {
  const before = body.slice(0, idx + kw.length);
  const after = body.slice(idx + kw.length);
  // Emit a COMPLETE markdown anchor: [phrase](/posts/slug).
  // The old version appended only `](url)` with no opening `[`, so every
  // injected link was invalid markdown (`prose](https://...)`) and rendered as
  // literal link soup on the live site. Rewrite the phrase in place instead of
  // duplicating it.
  // The target is RELATIVE on purpose -- see the BASE_URL note at the top.
  const head = before.slice(0, before.length - kw.length);
  return head + '[' + kw + '](/posts/' + slug + ')' + after;
}

async function getAiLinkSuggestions(post, allPosts) {
  const otherPosts = allPosts.filter(p => p.slug !== post.slug).slice(0, 50);
  const prompt = `You are an SEO editor adding internal links to a blog post.

Post: "${post.title}" (slug: ${post.slug})
Category: ${post.category}

Candidate posts to link to:
${otherPosts.map(p => `- ${p.title} (slug: ${p.slug}, category: ${p.category})`).join('\n')}

Post body (first 2000 chars):
${post.body.slice(0, 2000)}

Return a JSON array of link suggestions. Each suggestion:
{
  "phrase": "exact phrase from the post body to link",
  "slug": "target post slug",
  "reason": "why this link adds value"
}

Only suggest links where the phrase appears verbatim in the body. Use exact capitalization as it appears.`;

  return await json(prompt, { temperature: 0.3, maxTokens: 2048 });
}

async function runAiMode(posts) {
  console.log(`🤖 AI mode — Semantic linking\n`);
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

      body = addLink(body, idx, s.phrase, s.slug);
      modified = true;
      applied.push(s.phrase + ' -> ' + s.slug);
      totalAdded++;
    }

    if (modified) {
      const newContent = content.replace(/^---\r?\n[\s\S]+?\r?\n---\r?\n[\s\S]+$/, (match) => {
        return match.replace(post.body, body);
      });
      if (dryRun) {
        console.log(`📝 ${post.slug}: ${applied.length} links would be added`);
        applied.forEach(a => console.log(`   + ${a}`));
      } else {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`✅ ${post.slug}: ${applied.length} links added`);
      }
    }
  }

  console.log(`\n📊 AI mode: ${totalAdded} links added, ${totalFailed} failed`);
}

function runRuleMode(posts) {
  console.log(`📏 Rule-based mode — keyword matching\n`);
  const topicMap = buildTopicMap(posts);
  let totalAdded = 0;

  for (const post of posts) {
    const filePath = path.join(POSTS_DIR, `${post.slug}.mdx`);
    let content = fs.readFileSync(filePath, 'utf8');
    let body = content.match(/^---\r?\n[\s\S]+?\r?\n---\r?\n([\s\S]+)$/)?.[1];
    if (!body) continue;

    const matchedKeywords = new Set();
    let added = 0;

    for (const [kw, slugs] of Object.entries(topicMap)) {
      if (slugs.length === 0) continue;
      if (matchedKeywords.has(kw)) continue;

      const targetSlug = slugs.find(s => s !== post.slug);
      if (!targetSlug) continue;

      const idx = body.indexOf(kw);
      if (idx === -1) continue;
      if (isAlreadyLinked(body, idx, kw, targetSlug)) continue;

      body = addLink(body, idx, kw, targetSlug);
      matchedKeywords.add(kw);
      added++;
      totalAdded++;
    }

    if (added > 0) {
      const newContent = content.replace(/^---\r?\n[\s\S]+?\r?\n---\r?\n[\s\S]+$/, (match) => {
        return match.replace(post.body, body);
      });
      if (dryRun) {
        console.log(`📝 ${post.slug}: ${added} links would be added`);
      } else {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`✅ ${post.slug}: ${added} links added`);
      }
    }
  }

  console.log(`\n📊 Rule mode: ${totalAdded} links added`);
}

(async () => {
  const posts = getAllPosts();
  console.log(`📚 Loaded ${posts.length} posts\n`);

  if (useAI && hasKey()) {
    await runAiMode(posts);
  } else {
    if (useAI && !hasKey()) {
      console.log('⚠️ --ai flag used but no AI API key found. Falling back to rule-based.\n');
    }
    runRuleMode(posts);
  }
})();
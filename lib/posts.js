import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const postsDirectory = path.join(process.cwd(), 'content', 'posts');

// ---------------------------------------------------------------------------
// Content cache
//
// `next build` renders one page per post (944 static pages for 685 posts) and
// every one of those pages calls getAllPosts() / getRelatedPosts() /
// getAdjacentPosts(). Without memoization each call re-read and re-parsed all
// 685 .mdx files, which made the build quadratic: measured at ~4.5 s per page
// page (≈51 min of pure parsing), blowing the CI 30-min and the Vercel
// build-time limits and leaving production stale since 2026-09-22.
//
// The cache parses each file at most once per content signature. The
// signature (readdir + per-file stat, ~80 ms for 685 files) is re-computed at
// most once per second, so `next dev` and the /admin write APIs still see edits
// immediately instead of serving a stale process cache.
// ---------------------------------------------------------------------------

const SIGNATURE_TTL_MS = 1000;

let cache = null; // { signature, postsBySlug, slugs, sortedAll, checkedAt }

function computeSignature() {
  let names;
  try {
    names = fs.readdirSync(postsDirectory);
  } catch {
    return 'missing';
  }
  const parts = [];
  for (const name of names) {
    if (!/\.mdx?$/.test(name)) continue;
    try {
      const st = fs.statSync(path.join(postsDirectory, name));
      parts.push(`${name}:${st.mtimeMs}:${st.size}`);
    } catch {
      parts.push(`${name}:gone`);
    }
  }
  parts.sort();
  return parts.join('|');
}

function parsePost(realSlug) {
  const mdxPath = path.join(postsDirectory, `${realSlug}.mdx`);
  const mdPath = path.join(postsDirectory, `${realSlug}.md`);
  const fullPath = fs.existsSync(mdxPath) ? mdxPath : mdPath;
  if (!fs.existsSync(fullPath)) return null;
  try {
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);
    return { ...data, slug: realSlug, content, readingTime: estimateReadingTime(content) };
  } catch (err) {
    console.error(`Error reading post ${realSlug}:`, err.message);
    return null;
  }
}

function buildCache() {
  const signature = computeSignature();
  if (cache && cache.signature === signature) return cache;

  let names = [];
  try {
    names = fs.readdirSync(postsDirectory);
  } catch {
    names = [];
  }
  const slugs = names
    .filter((f) => /\.mdx?$/.test(f))
    .map((f) => f.replace(/\.mdx?$/, ''));

  const postsBySlug = new Map();
  for (const slug of slugs) {
    const post = parsePost(slug);
    if (post) postsBySlug.set(slug, post);
  }

  // Same ordering as before: date descending, drafts excluded.
  const sortedAll = Array.from(postsBySlug.values())
    .filter((p) => p.draft !== true)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  cache = { signature, postsBySlug, slugs, sortedAll, checkedAt: Date.now() };
  // Keywords derive from post bodies, so they must drop together with the
  // posts they were computed from — otherwise an edited post keeps scoring
  // with keywords from its previous revision.
  if (keywordsCache.size > 0) keywordsCache.clear();
  return cache;
}

function currentCache() {
  const now = Date.now();
  if (cache && now - cache.checkedAt < SIGNATURE_TTL_MS) return cache;
  return buildCache();
}

export function getAllPostSlugs() {
  return currentCache().slugs.slice();
}

export function getAllPosts({ includeDrafts = false } = {}) {
  const c = currentCache();
  const all = includeDrafts ? Array.from(c.postsBySlug.values()) : c.sortedAll;
  // Shallow copy on purpose: callers re-sort/filter the result and that must
  // never reorder the shared cache (Array#slice on 685 items is ~0.01 ms).
  return all.slice();
}

export function getPostBySlug(slug) {
  if (!slug) return null;
  const realSlug = slug.replace(/\.mdx?$/, '');
  return currentCache().postsBySlug.get(realSlug) || null;
}

export function getAllCategories() {
  const posts = getAllPosts();
  const cats = new Map();
  posts.forEach((p) => {
    if (!p.category) return;
    cats.set(p.category, (cats.get(p.category) || 0) + 1);
  });
  return Array.from(cats.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

export function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function extractKeywords(text, max = 20) {
  const stopWords = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','as','is','it','its','this','that','are','was','were','be','been','being','has','have','had','do','does','did','will','would','could','should','may','might','can','shall','not','no','nor','so','if','about','into','over','after','before','between','under','above','below','out','off','up','down','just','also','very','too','really','however','therefore','thus','hence','then','than','what','which','who','whom','when','where','why','how','all','each','every','both','few','more','most','some','any','none','one','two','other','another','like','such','only','own','same','new','now','here','there']);
  const words = text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
  const freq = {};
  words.forEach((w) => { freq[w] = (freq[w] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, max).map(([w]) => w);
}

// extractKeywords() itself is hot (every getRelatedPosts call re-tokenized all
// 685 posts), so memoize per (slug, max) instead of recomputing from raw text.
const keywordsCache = new Map(); // `${slug}:${max}` -> string[]

function keywordsFor(post, max) {
  const key = `${post.slug}:${max}`;
  let cached = keywordsCache.get(key);
  if (!cached) {
    cached = extractKeywords(post.content || '', max);
    keywordsCache.set(key, cached);
  }
  return cached;
}

export function getRelatedPosts(currentSlug, category, tags = [], limit = 3) {
  const all = getAllPosts().filter((p) => p.slug !== currentSlug);
  const currentPost = getPostBySlug(currentSlug);
  const currentKeywords = currentPost ? keywordsFor(currentPost, 30) : [];
  const currentTagsLower = tags.map((t) => t.toLowerCase());
  const now = Date.now();

  const scored = all.map((p) => {
    let score = 0;
    if (p.category === category) score += 4;
    const pTagsLower = (p.tags || []).map((t) => t.toLowerCase());
    pTagsLower.forEach((t) => { if (currentTagsLower.includes(t)) score += 2; });
    if (p.content) {
      const pKeywords = keywordsFor(p, 20);
      const overlap = pKeywords.filter((kw) => currentKeywords.includes(kw)).length;
      score += overlap * 0.5;
    }
    if (p.date) {
      const daysDiff = (now - new Date(p.date).getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff < 90) score += 1;
    }
    return { post: p, score };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.post);
}

export function getPostsByCategory(category) {
  return getAllPosts().filter((p) => p.category === category);
}

export function getCategoryBySlug(slug) {
  return getAllCategories().find((c) => slugify(c.name) === slug)?.name || slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export function getAllTags() {
  const posts = getAllPosts();
  const tags = new Map();
  posts.forEach((p) => (p.tags || []).forEach((t) => {
    const key = t.toLowerCase();
    if (tags.has(key)) {
      tags.get(key).count += 1;
    } else {
      tags.set(key, { name: t, count: 1 });
    }
  }));
  return Array.from(tags.values()).sort((a, b) => b.count - a.count);
}

export function getAdjacentPosts(currentSlug) {
  const all = getAllPosts();
  const idx = all.findIndex((p) => p.slug === currentSlug);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx < all.length - 1 ? all[idx + 1] : null,
    next: idx > 0 ? all[idx - 1] : null,
  };
}

function estimateReadingTime(text) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const postsDirectory = path.join(process.cwd(), 'content', 'posts');

export function getAllPostSlugs() {
  if (!fs.existsSync(postsDirectory)) return [];
  return fs.readdirSync(postsDirectory)
    .filter((f) => /\.mdx?$/.test(f))
    .map((f) => f.replace(/\.mdx?$/, ''));
}

export function getAllPosts({ includeDrafts = false } = {}) {
  const slugs = getAllPostSlugs();
  let posts = slugs.map((slug) => getPostBySlug(slug)).filter(Boolean);
  if (!includeDrafts) posts = posts.filter((p) => p.draft !== true);
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug) {
  try {
    const realSlug = slug.replace(/\.mdx?$/, '');
    const filePath = path.join(postsDirectory, `${realSlug}.mdx`);
    if (!fs.existsSync(filePath)) {
      const mdPath = path.join(postsDirectory, `${realSlug}.md`);
      if (!fs.existsSync(mdPath)) return null;
    }
    const fullPath = fs.existsSync(filePath) ? filePath : path.join(postsDirectory, `${realSlug}.md`);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);
    return { ...data, slug: realSlug, content, readingTime: estimateReadingTime(content) };
  } catch (err) {
    console.error(`Error reading post ${slug}:`, err.message);
    return null;
  }
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

export function getRelatedPosts(currentSlug, category, tags = [], limit = 3) {
  const all = getAllPosts().filter((p) => p.slug !== currentSlug);
  const currentPost = getPostBySlug(currentSlug);
  const currentKeywords = currentPost ? extractKeywords(currentPost.content || '', 30) : [];
  const currentTagsLower = tags.map((t) => t.toLowerCase());

  const scored = all.map((p) => {
    let score = 0;
    if (p.category === category) score += 4;
    const pTagsLower = (p.tags || []).map((t) => t.toLowerCase());
    pTagsLower.forEach((t) => { if (currentTagsLower.includes(t)) score += 2; });
    if (p.content) {
      const pKeywords = extractKeywords(p.content, 20);
      const overlap = pKeywords.filter((kw) => currentKeywords.includes(kw)).length;
      score += overlap * 0.5;
    }
    if (p.date) {
      const daysDiff = (new Date() - new Date(p.date)) / (1000 * 60 * 60 * 24);
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

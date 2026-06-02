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

export function getPostsByCategory(category) {
  return getAllPosts().filter((p) => p.category === category);
}

export function getAllTags() {
  const posts = getAllPosts();
  const tags = new Map();
  posts.forEach((p) => (p.tags || []).forEach((t) => tags.set(t, (tags.get(t) || 0) + 1)));
  return Array.from(tags.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

export function getRelatedPosts(currentSlug, category, limit = 3) {
  return getAllPosts()
    .filter((p) => p.slug !== currentSlug && p.category === category)
    .slice(0, limit);
}

function estimateReadingTime(text) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

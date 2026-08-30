import { NextResponse } from 'next/server';
import { getAllPosts, getAllCategories } from '../../lib/posts';
import { topics } from '../../lib/topics';
import { siteConfig } from '../../lib/config';

export const dynamic = 'force-static';

// Safely convert a post date to ISO; fall back to the newest-post date
// if invalid. Never emit the Unix epoch (1970) — it told crawlers the page
// was half a century old and suppressed crawl priority for /news, /reviews, etc.
function safeISO(value, fallback) {
  const d = new Date(value);
  if (!isNaN(d.getTime())) return d.toISOString();
  return fallback ? fallback.toISOString() : new Date().toISOString();
}

export async function GET() {
  const base = siteConfig.url;
  const posts = getAllPosts();
  const categories = getAllCategories();
  const newestPost = posts.reduce((latest, p) => {
    const d = new Date(p.lastUpdated || p.date);
    return !isNaN(d.getTime()) && d > latest ? d : latest;
  }, new Date(0));

  const pageUrls = [
    `${base}/`, `${base}/news`, `${base}/reviews`, `${base}/best`, `${base}/comparisons`,
    `${base}/tutorials`, `${base}/about`, `${base}/search`, `${base}/topics`,
  ];
  const postUrls = [
    ...posts.filter((p) => p.category !== 'AI News').map((p) => `${base}/posts/${p.slug}`),
    ...posts.filter((p) => p.category === 'AI News').map((p) => `${base}/news/${p.slug}`),
  ];
  const categoryUrls = categories.map((c) => `${base}/category/${c.name.toLowerCase().replace(/\s+/g, '-')}`);
  const topicUrls = topics.map((t) => `${base}/topics/${t.slug}`);

  const changefreqFor = (u) => {
    if (u === base + '/') return 'daily';
    if (pageUrls.includes(u)) return 'weekly';
    if (postUrls.includes(u)) return 'weekly';
    return 'monthly';
  };

  const priorityFor = (u) => {
    if (u === base + '/') return '1.0';
    if (pageUrls.includes(u)) return '0.9';
    if (postUrls.includes(u)) return '0.8';
    return '0.7';
  };

  const lastmodFor = (u) => {
    if (postUrls.includes(u)) {
      const slug = u.replace(base + '/posts/', '').replace(base + '/news/', '');
      const post = posts.find((p) => p.slug === slug);
      if (post) return safeISO(post.lastUpdated || post.date);
    }
    if (u === base + '/' || u === base + '/topics' || categoryUrls.includes(u) || topicUrls.includes(u)) {
      return newestPost.toISOString();
    }
    // Category pages and any other static section fall back to newest-post date,
    // never the 1970 epoch.
    return newestPost.toISOString();
  };

  const allUrls = [...new Set([...pageUrls, ...postUrls, ...categoryUrls, ...topicUrls])];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map((u) => `  <url><loc>${u}</loc><lastmod>${lastmodFor(u)}</lastmod><changefreq>${changefreqFor(u)}</changefreq><priority>${priorityFor(u)}</priority></url>`).join('\n')}
</urlset>`;
  return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}

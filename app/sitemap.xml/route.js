import { NextResponse } from 'next/server';
import { getAllPosts, getAllCategories, slugify } from '../../lib/posts';
import { topics } from '../../lib/topics';
import { siteConfig } from '../../lib/config';
import { LANGS, TRANSLATED_PATHS } from '../../lib/i18n';

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
    `${base}/tutorials`, `${base}/about`, `${base}/contact`, `${base}/privacy`, `${base}/terms`, `${base}/disclaimer`, `${base}/search`, `${base}/topics`,
  ];
  const postUrls = [
    // noindex posts stay out of the sitemap: a sitemap entry says "index me".
    ...posts.filter((p) => p.category !== 'AI News' && !p.noindex).map((p) => `${base}/posts/${p.slug}`),
    ...posts.filter((p) => p.category === 'AI News' && !p.noindex).map((p) => `${base}/news/${p.slug}`),
  ];
  const categoryUrls = categories.map((c) => `${base}/category/${slugify(c.name)}`);
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

  const i18nUrls = LANGS.flatMap((l) => Object.values(TRANSLATED_PATHS).map((sub) => `${base}/${l}${sub}`));
  const allUrls = [...new Set([...pageUrls, ...postUrls, ...categoryUrls, ...topicUrls, ...i18nUrls])];


  const altFor = (u) => {
    const rel = u.replace(base, '') || '/';
    let en = null;
    if (rel in TRANSLATED_PATHS) en = rel;
    else { const m = LANGS.find((l) => rel === '/' + l || rel.startsWith('/' + l + '/')); if (m) { const sub = rel.slice(m.length + 1); en = sub === '' ? '/' : sub; } }
    if (!en || !(en in TRANSLATED_PATHS)) return '';
    const enUrl = base + (en === '/' ? '/' : en);
    const links = [`<xhtml:link rel="alternate" hreflang="en" href="${enUrl}"/>`, `<xhtml:link rel="alternate" hreflang="x-default" href="${enUrl}"/>`];
    LANGS.forEach((l) => links.push(`<xhtml:link rel="alternate" hreflang="${l}" href="${base}/${l}${TRANSLATED_PATHS[en]}"/>`));
    return links.join('');
  };

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${allUrls.map((u) => `  <url><loc>${u}</loc><lastmod>${lastmodFor(u)}</lastmod><changefreq>${changefreqFor(u)}</changefreq><priority>${priorityFor(u)}</priority>${altFor(u)}</url>`).join('\n')}
</urlset>`;
  return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}

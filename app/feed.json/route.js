import { getAllPosts } from '../../lib/posts';
import { siteConfig } from '../../lib/config';

export const dynamic = 'force-static';

// Safely convert a post date to ISO; fall back to the Unix epoch (1970-01-01)
// if invalid. The epoch is a stable sentinel that can never go stale — unlike
// a hard-coded "current year" which would rot on every Jan 1.
function safeISO(value) {
  const d = new Date(value);
  return isNaN(d.getTime()) ? '1970-01-01T00:00:00.000Z' : d.toISOString();
}

export async function GET() {
  const items = getAllPosts().map((p) => ({
    id: `${siteConfig.url}/${p.category === 'AI News' ? 'news' : 'posts'}/${p.slug}`,
    url: `${siteConfig.url}/${p.category === 'AI News' ? 'news' : 'posts'}/${p.slug}`,
    title: p.title,
    summary: p.excerpt || '',
    content_text: p.excerpt || '',
    date_published: safeISO(p.date),
    date_modified: safeISO(p.lastUpdated || p.date),
    authors: [{ name: p.author || siteConfig.author }],
    tags: p.tags || [],
    _category: p.category,
  }));
  return Response.json({
    version: 'https://jsonfeed.org/version/1.1',
    title: siteConfig.name,
    home_page_url: siteConfig.url,
    feed_url: `${siteConfig.url}/feed.json`,
    description: siteConfig.tagline,
    language: 'en-US',
    items,
  }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
}

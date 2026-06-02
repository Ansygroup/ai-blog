import { getAllPosts } from '../../lib/posts';
import { siteConfig } from '../../lib/config';

export const dynamic = 'force-static';

export async function GET() {
  const items = getAllPosts().map((p) => ({
    id: `${siteConfig.url}/posts/${p.slug}`,
    url: `${siteConfig.url}/posts/${p.slug}`,
    title: p.title,
    summary: p.excerpt || '',
    content_text: p.excerpt || '',
    date_published: new Date(p.date).toISOString(),
    date_modified: new Date(p.lastUpdated || p.date).toISOString(),
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

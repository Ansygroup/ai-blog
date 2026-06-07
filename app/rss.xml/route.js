import RSS from 'rss';
import { getAllPosts } from '../../lib/posts';
import { siteConfig } from '../../lib/config';

export const dynamic = 'force-static';

export async function GET() {
  const feed = new RSS({
    title: siteConfig.name,
    description: siteConfig.tagline,
    site_url: siteConfig.url,
    feed_url: `${siteConfig.url}/rss.xml`,
    language: 'en-US',
    pubDate: new Date(),
    ttl: 60,
  });
  getAllPosts().forEach((p) => {
    const isNews = p.category === 'AI News';
    feed.item({
      title: p.title,
      description: p.excerpt || p.description || '',
      url: `${siteConfig.url}/${isNews ? 'news' : 'posts'}/${p.slug}`,
      guid: p.slug,
      author: p.author || siteConfig.author,
      date: p.date,
      categories: [p.category, ...(p.tags || [])],
    });
  });
  return new Response(feed.xml({ indent: true }), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
  });
}

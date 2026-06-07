import RSS from 'rss';
import { getAllPosts } from '../../../lib/posts';
import { siteConfig } from '../../../lib/config';

export const dynamic = 'force-static';

export async function GET() {
  const newsPosts = getAllPosts().filter(p => p.category === 'AI News').slice(0, 100);

  const feed = new RSS({
    title: `${siteConfig.name} — AI News`,
    description: 'Breaking AI news, research breakthroughs, product launches, and industry analysis.',
    site_url: `${siteConfig.url}/news`,
    feed_url: `${siteConfig.url}/news/feed.xml`,
    language: 'en-US',
    pubDate: new Date(),
    ttl: 30,
  });

  newsPosts.forEach(p => {
    feed.item({
      title: p.title,
      description: p.excerpt || p.description || '',
      url: `${siteConfig.url}/news/${p.slug}`,
      guid: p.slug,
      author: p.author || siteConfig.author,
      date: p.date,
      categories: [p.category, ...(p.tags || [])],
    });
  });

  return new Response(feed.xml({ indent: true }), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=1800, s-maxage=1800' },
  });
}

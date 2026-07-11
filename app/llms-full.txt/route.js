import { siteConfig } from '../../lib/config';
import { getAllPosts } from '../../lib/posts';

export const dynamic = 'force-static';

export async function GET() {
  const posts = getAllPosts();
  const lines = posts.map((p) => {
    const date = p.date || p.publishedAt || '';
    const desc = (p.description || p.excerpt || '').replace(/\s+/g, ' ').trim();
    return `- [${p.title}](${siteConfig.url}/${p.slug})${date ? ` (${String(date).slice(0, 10)})` : ''}${desc ? ` — ${desc}` : ''}`;
  });

  return new Response(`# ${siteConfig.name} — Full content index (${siteConfig.url})

> ${siteConfig.tagline}

## About
${siteConfig.aiDescription}

## All articles (${posts.length})
${lines.join('\n')}

## Feeds
- RSS: ${siteConfig.url}/rss.xml
- Sitemap: ${siteConfig.url}/sitemap.xml
- llms.txt: ${siteConfig.url}/llms.txt
`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

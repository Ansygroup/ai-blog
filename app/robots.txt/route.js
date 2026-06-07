import { siteConfig } from '../../lib/config';

export const dynamic = 'force-static';

export async function GET() {
  const sitemapUrl = `${siteConfig.url}/sitemap.xml`;
  const newsSitemapUrl = `${siteConfig.url}/news-sitemap.xml`;
  return new Response(`# robots.txt — controls how search engines + AI crawlers see you

# Standard search engines: allow everything
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /private/

Sitemap: ${sitemapUrl}
Sitemap: ${newsSitemapUrl}

# AI SEARCH ENGINES — explicit permissions (GEO)
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: CCBot
Allow: /

User-agent: Bytespider
Allow: /

User-agent: Meta-ExternalAgent
Allow: /

User-agent: Diffbot
Allow: /

# Rate-limit scrapers
User-agent: AhrefsBot
Crawl-delay: 10

User-agent: SemrushBot
Crawl-delay: 10

User-agent: MJ12bot
Crawl-delay: 30
`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

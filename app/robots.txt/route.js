import { NextResponse } from 'next/server';
import { siteConfig } from '../../lib/config';

export const dynamic = 'force-static';

export async function GET() {
  const body = `User-agent: *
User-agent: Googlebot
User-agent: Bingbot
User-agent: GPTBot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: PerplexityBot
User-agent: ClaudeBot
User-agent: Claude-SearchBot
User-agent: Google-Extended
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /search?

Sitemap: ${siteConfig.url}/sitemap.xml
Sitemap: ${siteConfig.url}/news-sitemap.xml
`;
  return new NextResponse(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

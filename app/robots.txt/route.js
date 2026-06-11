import { NextResponse } from 'next/server';
import { siteConfig } from '../../lib/config';

export const dynamic = 'force-static';

export async function GET() {
  const body = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /tag/
Disallow: /_next/
Disallow: /search?

Sitemap: ${siteConfig.url}/sitemap.xml
Sitemap: ${siteConfig.url}/news-sitemap.xml
`;
  return new NextResponse(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

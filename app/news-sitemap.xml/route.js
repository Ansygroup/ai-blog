import { NextResponse } from 'next/server';
import { getAllPosts } from '../../lib/posts';
import { siteConfig } from '../../lib/config';

export const dynamic = 'force-static';

export async function GET() {
  const base = siteConfig.url;
  const newsPosts = getAllPosts().filter(p => p.category === 'AI News').slice(0, 1000);

  if (newsPosts.length === 0) {
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
  }

  function safeDate(d) {
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? '2026-01-01' : parsed.toISOString().split('T')[0];
  }

  function escapeXml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${newsPosts.map(p => `  <url>
    <loc>${base}/news/${p.slug}</loc>
    <lastmod>${safeDate(p.lastUpdated || p.date)}</lastmod>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(siteConfig.name)}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${safeDate(p.date)}</news:publication_date>
      <news:title>${escapeXml(p.title)}</news:title>
    </news:news>
  </url>`).join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=1800' },
  });
}

// Next.js App Router — public files like robots.txt, llms.txt go in /public
// The files in /public/robots.txt, /public/llms.txt, /public/sitemap-extra etc.
// are served at the root. We can't generate these dynamically without middleware
// — but static files are simpler and faster for crawlers.
//
// Files in this directory are copied verbatim at build time.

import { NextResponse } from 'next/server';
import { getAllPosts } from '../../lib/posts';
import { siteConfig } from '../../lib/config';

export const dynamic = 'force-static';

export async function GET() {
  const base = siteConfig.url;
  const urls = [
    `${base}/`, `${base}/reviews`, `${base}/best`, `${base}/comparisons`, `${base}/tutorials`, `${base}/about`,
    ...getAllPosts().map((p) => `${base}/posts/${p.slug}`),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><changefreq>weekly</changefreq><priority>${u === base + '/' ? '1.0' : '0.8'}</priority></url>`).join('\n')}
</urlset>`;
  return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}

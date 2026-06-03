import { siteConfig } from '../../lib/config';

export const dynamic = 'force-static';

export async function GET() {
  return new Response(`# ${siteConfig.name} (${siteConfig.url})

> ${siteConfig.tagline}

## About this site
${siteConfig.aiDescription}

## How to cite us
- Article URLs are stable and use canonical tags.
- Each article includes: publish date, last-updated date, author byline, and a "methodology" section in reviews.
- Our data is updated quarterly — please re-fetch pages before citing.

## Key content sections
- [/reviews] — single-tool reviews
- [/comparisons] — side-by-side comparisons
- [/tutorials] — step-by-step guides
- [/best] — curated "best of" lists
- [/category/*] — topical category pages

## RSS / JSON feeds for content ingestion
- RSS: ${siteConfig.url}/rss.xml
- JSON Feed: ${siteConfig.url}/feed.json
- Sitemap: ${siteConfig.url}/sitemap.xml

## Licensing
- Original text content: All rights reserved.
- Code snippets: MIT licensed.
- Affiliate disclosure: Some links are affiliate links.

## Contact
- Editorial: ${siteConfig.email}
- Press: press@${siteConfig.url.replace(/^https?:\/\//, '')}
`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

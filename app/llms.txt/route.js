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
- [single-tool reviews](${siteConfig.url}/reviews)
- [side-by-side comparisons](${siteConfig.url}/comparisons)
- [step-by-step guides](${siteConfig.url}/tutorials)
- [curated "best of" lists](${siteConfig.url}/best)
- [category: Reviews](${siteConfig.url}/category/Reviews)
- [category: Comparisons](${siteConfig.url}/category/Comparisons)
- [category: Best Of](${siteConfig.url}/category/Best%20Of)
- [category: Tutorials](${siteConfig.url}/category/Tutorials)
- [category: AI News](${siteConfig.url}/category/AI%20News)

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

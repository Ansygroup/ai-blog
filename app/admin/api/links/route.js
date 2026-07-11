import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

export async function GET() {
  try {
    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
    const allLinks = [];
    let totalLinks = 0;
    let externalLinks = 0;

    for (const file of files) {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8').replace(/\r\n/g, '\n');
      const slug = file.replace(/\.mdx$/, '');
      const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (!match) continue;
      const title = (match[1].match(/^title:\s*"(.+?)"/m) || [])[1] || slug;
      const body = match[2];
      const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
      let m;
      const postLinks = [];

      while ((m = linkRegex.exec(body)) !== null) {
        const url = m[2].trim();
        const text = m[1].trim();
        if (!url || url.startsWith('#') || url.startsWith('mailto:')) continue;
        const isInternal = url.startsWith('/');
        const domain = isInternal ? 'internal' : new URL(url).hostname.replace(/^www\./, '');
        totalLinks++;
        if (!isInternal) externalLinks++;
        postLinks.push({ text: text.slice(0, 80), url, isInternal, domain });
      }

      allLinks.push({ slug, title, links: postLinks, count: postLinks.length });
    }

    const domainCounts = {};
    allLinks.forEach(p => p.links.forEach(l => {
      if (!l.isInternal) {
        domainCounts[l.domain] = (domainCounts[l.domain] || 0) + 1;
      }
    }));

    const sortedDomains = Object.entries(domainCounts).sort((a, b) => b[1] - a[1]);

    return Response.json({
      posts: allLinks.filter(p => p.count > 0).sort((a, b) => b.count - a.count),
      totalPosts: files.length,
      totalLinks,
      externalLinks,
      internalLinks: totalLinks - externalLinks,
      externalDomains: sortedDomains.slice(0, 30).map(([domain, count]) => ({ domain, count })),
      noLinks: allLinks.filter(p => p.count === 0).map(p => ({ slug: p.slug, title: p.title })),
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

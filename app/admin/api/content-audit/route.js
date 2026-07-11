import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

export async function GET() {
  try {
    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
    const posts = [];

    for (const file of files) {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8').replace(/\r\n/g, '\n');
      const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (!match) continue;
      const fm = match[1];
      const body = match[2];
      const get = (k) => {
        const m = fm.match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm'));
        return m ? m[1].trim() : '';
      };
      const tagsRaw = get('tags');
      const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim().replace(/^\[|\]$/g, '')).filter(Boolean) : [];

      const wordCount = body.split(/\s+/).filter(Boolean).length;
      const internalLinks = (body.match(/\[([^\]]*)\]\(\/(?!\/)[^)]+\)/g) || []).length;
      const externalLinks = (body.match(/\[([^\]]*)\]\(https?:\/\/[^)]+\)/g) || []).length;
      const excerpt = get('excerpt');
      const seoScore = parseInt(get('seoScore'));
      const date = get('date');
      const lastUpdated = get('lastUpdated') || date;
      const draft = get('draft') === 'true';

      const now = new Date();
      const pubDate = date ? new Date(date) : null;
      const updDate = lastUpdated ? new Date(lastUpdated) : pubDate;
      const daysSinceUpdate = updDate ? Math.floor((now - updDate) / 86400000) : null;

      posts.push({
        slug: file.replace(/\.mdx$/, ''),
        title: get('title') || file.replace(/\.mdx$/, ''),
        category: get('category') || 'Uncategorized',
        tags,
        date,
        lastUpdated,
        wordCount,
        readingTime: Math.max(1, Math.round(wordCount / 200)),
        seoScore: isNaN(seoScore) ? null : seoScore,
        excerpt,
        excerptLength: excerpt ? excerpt.length : 0,
        internalLinks,
        externalLinks,
        draft,
        daysSinceUpdate,
      });
    }

    const avgWordCount = Math.round(posts.reduce((s, p) => s + p.wordCount, 0) / posts.length);
    const avgSeo = posts.filter(p => p.seoScore).reduce((s, p) => s + p.seoScore, 0) / posts.filter(p => p.seoScore).length;
    const totalIntLinks = posts.reduce((s, p) => s + p.internalLinks, 0);
    const totalExtLinks = posts.reduce((s, p) => s + p.externalLinks, 0);
    const staleThreshold = 180;

    return Response.json({
      posts,
      summary: {
        total: posts.length,
        published: posts.filter(p => !p.draft).length,
        drafts: posts.filter(p => p.draft).length,
        avgWordCount,
        avgSeo: Math.round(avgSeo * 10) / 10,
        totalIntLinks,
        totalExtLinks,
        stale: posts.filter(p => p.daysSinceUpdate !== null && p.daysSinceUpdate > staleThreshold).length,
        thinContent: posts.filter(p => p.wordCount < 700).length,
        noExcerpt: posts.filter(p => !p.excerpt).length,
        excerptIssues: posts.filter(p => p.excerpt && (p.excerpt.length < 120 || p.excerpt.length > 160)).length,
      },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

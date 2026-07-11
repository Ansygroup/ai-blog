import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.toLowerCase();
    const category = searchParams.get('category');
    const status = searchParams.get('status'); // draft, published, all

    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
    const results = [];

    for (const file of files) {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8').replace(/\r\n/g, '\n');
      const fm = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (!fm) continue;
      const frontmatter = fm[1];
      const body = fm[2];

      const get = (k) => { const m = frontmatter.match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm')); return m ? m[1].trim() : ''; };
      const slug = file.replace(/\.mdx$/, '');
      const title = get('title') || slug;
      const draft = get('draft') === 'true';
      const cat = get('category') || '';

      if (status === 'draft' && !draft) continue;
      if (status === 'published' && draft) continue;
      if (category && cat !== category) continue;

      const excerpt = get('excerpt') || '';
      const lowerBody = body.toLowerCase();
      const lowerTitle = title.toLowerCase();
      const lowerExcerpt = excerpt.toLowerCase();

      if (q) {
        if (!lowerTitle.includes(q) && !lowerExcerpt.includes(q) && !lowerBody.includes(q)) continue;
      }

      // Find context around matches
      let matchContext = '';
      if (q && lowerBody.includes(q)) {
        const idx = lowerBody.indexOf(q);
        const start = Math.max(0, idx - 60);
        const end = Math.min(body.length, idx + q.length + 80);
        matchContext = (start > 0 ? '...' : '') + body.slice(start, end) + (end < body.length ? '...' : '');
      }

      results.push({
        slug, title, draft, category: cat, date: get('date') || '',
        seoScore: parseInt(get('seoScore')) || 0,
        wordCount: body.split(/\s+/).filter(Boolean).length,
        excerpt: excerpt.slice(0, 150),
        matchContext,
        matchedIn: q ? [
          lowerTitle.includes(q) ? 'title' : null,
          lowerExcerpt.includes(q) ? 'excerpt' : null,
          lowerBody.includes(q) ? 'body' : null,
        ].filter(Boolean) : [],
      });
    }

    return Response.json({
      query: q || '',
      total: results.length,
      results: results.sort((a, b) => b.date.localeCompare(a.date)),
      categories: [...new Set(results.map(r => r.category).filter(Boolean))].sort(),
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

function loadPosts() {
  return fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx')).map(f => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8').replace(/\r\n/g, '\n');
    const slug = f.replace(/\.mdx$/, '');
    const match = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;
    const fm = match[1];
    const title = (fm.match(/^title:\s*"(.+?)"/m) || [])[1] || slug;
    const date = (fm.match(/^date:\s*'?([^'\n]+)'?/m) || [])[1] || '';
    const lastUpdated = (fm.match(/^lastUpdated:\s*'?([^'\n]+)'?/m) || [])[1] || date;
    const category = (fm.match(/^category:\s*'?([^'\n]+)'?/m) || [])[1] || '';
    const excerpt = (fm.match(/^excerpt:\s*"(.+?)"/m) || [])[1] || '';
    const seoScore = parseInt((fm.match(/^seoScore:\s*(\d+)/m) || [])[1]) || 0;
    const body = raw.slice(match[0].length).trim();
    const tags = (fm.match(/^tags:\s*\[([^\]]*)\]/m) || [])[1]?.split(',').map(t => t.trim().replace(/['"]/g, '')).filter(Boolean) || [];
    return {
      slug, title, date, lastUpdated, category, excerpt,
      seoScore, wordCount: body.split(/\s+/).length, tags,
    };
  }).filter(Boolean).filter(p => !p.slug.startsWith('draft-'));
}

export async function GET() {
  try {
    const posts = loadPosts();
    const now = Date.now();

    const withStaleness = posts.map(p => {
      const updateDate = p.lastUpdated || p.date;
      const msSinceUpdate = updateDate ? now - new Date(updateDate).getTime() : Infinity;
      const daysSinceUpdate = msSinceUpdate > 0 ? Math.floor(msSinceUpdate / 86400000) : 0;
      return { ...p, daysSinceUpdate, stale: daysSinceUpdate > 180 };
    });

    const sorted = withStaleness.sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);

    return Response.json({
      posts: sorted,
      total: sorted.length,
      stale: sorted.filter(p => p.stale).length,
      fresh: sorted.filter(p => !p.stale).length,
      needsRefresh: sorted.filter(p => p.daysSinceUpdate > 90).length,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

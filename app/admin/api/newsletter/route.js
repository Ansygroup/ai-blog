import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');
const DIGESTS_DIR = path.join(process.cwd(), 'public', 'digests');

function loadPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx')).map(f => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8').replace(/\r\n/g, '\n');
    const slug = f.replace(/\.mdx$/, '');
    const match = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;
    const fm = match[1];
    const title = (fm.match(/^title:\s*"(.+?)"/m) || [])[1] || slug;
    const excerpt = (fm.match(/^excerpt:\s*"(.+?)"/m) || [])[1] || '';
    const date = (fm.match(/^date:\s*'?([^'\n]+)'?/m) || [])[1] || '';
    const category = (fm.match(/^category:\s*'?([^'\n]+)'?/m) || [])[1] || '';
    return { slug, title, excerpt, date, category };
  }).filter(Boolean);
}

function getDigestHistory() {
  if (!fs.existsSync(DIGESTS_DIR)) return [];
  return fs.readdirSync(DIGESTS_DIR).filter(f => f.endsWith('.md')).sort().reverse().slice(0, 20).map(f => {
    return { file: f, date: f.replace(/^digest-|\.md$/g, ''), path: `/digests/${f}` };
  });
}

export async function GET() {
  try {
    const posts = loadPosts();
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = posts.filter(p => {
      const d = new Date(p.date);
      return !isNaN(d) && d.getTime() > oneWeekAgo;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    const history = getDigestHistory();

    return Response.json({
      recentPosts: recent.slice(0, 20),
      totalPosts: posts.length,
      history,
      weekStart: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { slugs } = await req.json();
    if (!slugs || !Array.isArray(slugs) || slugs.length === 0) {
      return Response.json({ error: 'slugs array required' }, { status: 400 });
    }

    const posts = loadPosts();
    const selected = slugs.map(slug => posts.find(p => p.slug === slug)).filter(Boolean);
    if (selected.length === 0) {
      return Response.json({ error: 'No valid posts found' }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ai-blog-ten-steel.vercel.app';
    const lines = [];
    lines.push('# AI Pulse Daily — Weekly Digest');
    lines.push('');
    lines.push(`Week of ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(`## This Week's Top Stories (${selected.length} new articles)`);
    lines.push('');

    for (const p of selected) {
      const url = `${siteUrl}/posts/${p.slug}`;
      lines.push(`### [${p.title}](${url})`);
      if (p.excerpt) lines.push(`> ${p.excerpt}`);
      lines.push(`*${p.category || 'Article'} · ${new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}*`);
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('*Sent by [AI Blog](https://ai-blog-ten-steel.vercel.app)*');

    const content = lines.join('\n');
    const fileName = `digest-${Date.now()}.md`;
    fs.mkdirSync(DIGESTS_DIR, { recursive: true });
    fs.writeFileSync(path.join(DIGESTS_DIR, fileName), content, 'utf8');

    return Response.json({
      success: true,
      fileName,
      content,
      postCount: selected.length,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
    const allPosts = files.map(f => {
      const raw = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8').replace(/\r\n/g, '\n');
      const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (!match) return null;
      const fm = match[1];
      const body = match[2];
      const get = (k) => { const m = fm.match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm')); return m ? m[1].trim() : ''; };
      return {
        slug: f.replace(/\.mdx$/, ''),
        title: get('title') || '',
        excerpt: get('excerpt') || '',
        date: get('date') || '',
        seoScore: parseInt(get('seoScore')) || null,
        wordCount: body.split(/\s+/).filter(Boolean).length,
      };
    }).filter(Boolean);

    if (slug) {
      const post = allPosts.find(p => p.slug === slug);
      if (!post) return Response.json({ error: 'Post not found' }, { status: 404 });
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ai-blog-ten-steel.vercel.app';
      return Response.json({
        post,
        previewUrl: `${siteUrl}/posts/${slug}`,
        suggestions: [],
      });
    }

    return Response.json({
      posts: allPosts.sort((a, b) => (b.seoScore || 0) - (a.seoScore || 0)),
      total: allPosts.length,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

import fs from 'fs';
import path from 'path';
import { groqJson } from '@/lib/groq';

export const dynamic = 'force-dynamic';

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

function loadPosts() {
  return fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx')).map(f => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8').replace(/\r\n/g, '\n');
    const slug = f.replace(/\.mdx$/, '');
    const match = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;
    const fm = {};
    let excerpt = '', seoTitle = '', seoScore = '0', tags = [];
    match[1].split('\n').forEach(line => {
      const sep = line.indexOf(':');
      if (sep === -1) return;
      const key = line.slice(0, sep).trim();
      let val = line.slice(sep + 1).trim().replace(/^['"](.*)['"]$/, '$1');
      fm[key] = val;
      if (key === 'excerpt') excerpt = val;
      if (key === 'seoTitle') seoTitle = val;
      if (key === 'seoScore') seoScore = val;
    });
    const tagsMatch = match[1].match(/^tags:\s*\[([^\]]+)\]/m);
    if (tagsMatch) tags = tagsMatch[1].split(',').map(t => t.trim().replace(/['"]/g, ''));
    const body = raw.slice(match[0].length).trim();
    return {
      slug, title: fm.title || slug, excerpt, seoTitle, seoScore: parseInt(seoScore) || 0,
      wordCount: body.split(/\s+/).length, date: fm.date || '', category: fm.category || '',
      tags, hasYear: /\b2026\b/.test(fm.title || ''), draft: fm.draft === 'true',
    };
  }).filter(Boolean);
}

function analyzeMeta(post) {
  const issues = [];
  if (!post.excerpt || post.excerpt.length < 50) issues.push('excerpt-too-short');
  else if (post.excerpt.length > 165) issues.push('excerpt-too-long');
  if (!post.hasYear) issues.push('missing-year');
  if (post.title.length > 70) issues.push('title-too-long');
  if (post.title.length < 20) issues.push('title-too-short');
  return issues;
  return issues;
}

export async function GET() {
  try {
    const posts = loadPosts().filter(p => !p.draft);
    const withIssues = posts.map(p => ({ ...p, issues: analyzeMeta(p) }));
    const needsHelp = withIssues.filter(p => p.issues.length > 0).sort((a, b) => b.issues.length - a.issues.length);
    return Response.json({
      total: posts.length,
      needsHelp: needsHelp.length,
      posts: needsHelp.slice(0, 100),
      allGood: posts.filter(p => p.issues.length === 0).length,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { slug, title, excerpt } = await req.json();
    if (!slug) return Response.json({ error: 'slug required' }, { status: 400 });

    const filePath = path.join(POSTS_DIR, `${slug}.mdx`);
    if (!fs.existsSync(filePath)) return Response.json({ error: 'Post not found' }, { status: 404 });

    let raw = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    if (title) {
      const titleRegex = /^title:\s*".*"/m;
      if (titleRegex.test(raw)) {
        raw = raw.replace(titleRegex, `title: "${title}"`);
        modified = true;
      }
    }

    if (excerpt) {
      const excerptRegex = /^excerpt:\s*".*"/m;
      if (excerptRegex.test(raw)) {
        raw = raw.replace(excerptRegex, `excerpt: "${excerpt}"`);
        modified = true;
      } else {
        raw = raw.replace(/^(title:.*)$/m, `$1\nexcerpt: "${excerpt}"`);
        modified = true;
      }
    }

    const seoTitleRegex = /^seoTitle:\s*".*"/m;
    if (title && seoTitleRegex.test(raw)) {
      raw = raw.replace(seoTitleRegex, `seoTitle: "${title}"`);
    } else if (title) {
      raw = raw.replace(/^---\n/, `---\nseoTitle: "${title}"\n`);
    }

    if (modified) {
      fs.writeFileSync(filePath, raw, 'utf8');
      return Response.json({ success: true, slug, title, excerpt });
    }

    return Response.json({ success: true, slug, unchanged: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json();
    if (!body.slugs || !Array.isArray(body.slugs)) {
      return Response.json({ error: 'slugs array required' }, { status: 400 });
    }

    const posts = loadPosts();
    let applied = 0;

    for (const slug of body.slugs) {
      const post = posts.find(p => p.slug === slug);
      if (!post) continue;

      const issues = analyzeMeta(post);
      if (issues.length === 0) continue;

      const suggestions = {};
      if (issues.includes('missing-year') && !post.hasYear) {
        suggestions.title = post.title.replace(/(\d{4})/, '2026');
        if (suggestions.title === post.title) {
          suggestions.title = post.title.endsWith('?') || post.title.endsWith('!') ? post.title.slice(0, -1) + ' (2026)' : `${post.title} (2026)`;
        }
      }
      if (issues.includes('excerpt-too-short') || !post.excerpt || post.excerpt.length < 50) {
        suggestions.excerpt = `Discover the best ${post.title.toLowerCase()} in 2026. Compare features, pricing, and performance to find the perfect solution for your needs.`;
      }
      if (post.excerpt && post.excerpt.length > 165) {
        suggestions.excerpt = post.excerpt.slice(0, 162).trim().replace(/\s+\S*$/, '') + '...';
      }

      if (suggestions.title || suggestions.excerpt) {
        await fetch(`http://localhost:${process.env.PORT || 3000}/admin/api/seo-meta`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, ...suggestions }),
        }).catch(() => {});
        applied++;
      }
    }

    return Response.json({ success: true, applied });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

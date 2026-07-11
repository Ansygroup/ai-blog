import fs from 'fs';
import path from 'path';

export const revalidate = 3600;

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');
const NEWS_DIR = path.join(process.cwd(), 'content', 'news');

export async function GET() {
  try {
    const issues = [];

    // Check posts
    const postFiles = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
    const slugs = new Map();

    for (const file of postFiles) {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8').replace(/\r\n/g, '\n');
      const match = raw.match(/^---\n([\s\S]*?)\n---/);
      if (!match) { issues.push({ type: 'error', file, msg: 'No valid frontmatter' }); continue; }
      const fm = match[1];
      const get = (k) => { const m = fm.match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm')); return m ? m[1].trim() : ''; };
      const slug = file.replace(/\.mdx$/, '');
      const title = get('title');
      const date = get('date');
      const category = get('category');
      const excerpt = get('excerpt');
      const seoScore = get('seoScore');

      if (!title) issues.push({ type: 'warning', file, msg: 'Missing title' });
      if (!date) issues.push({ type: 'warning', file, msg: 'Missing date' });
      if (!category) issues.push({ type: 'warning', file, msg: 'Missing category' });
      if (!excerpt) issues.push({ type: 'info', file, msg: 'Missing excerpt' });
      else if (excerpt.length < 120 || excerpt.length > 160) issues.push({ type: 'info', file, msg: `Excerpt length ${excerpt.length} (target 120-160)` });
      if (!seoScore || isNaN(parseInt(seoScore))) issues.push({ type: 'info', file, msg: 'Missing SEO score' });

      if (slugs.has(slug)) issues.push({ type: 'error', file, msg: `Duplicate slug: ${slug}` });
      slugs.set(slug, title);
    }

    // Check internal links resolve
    const allPostSlugs = new Set(postFiles.map(f => f.replace(/\.mdx$/, '')));
    for (const file of postFiles) {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8').replace(/\r\n/g, '\n');
      const body = raw.split('---').slice(2).join('---');
      const internalLinks = body.match(/\[([^\]]*)\]\(\/(?:posts|news)\/([^)]+)\)/g);
      if (!internalLinks) continue;
      for (const link of internalLinks) {
        const target = link.match(/\/posts\/([^)]+)/)?.[1];
        if (target && !allPostSlugs.has(target)) {
          issues.push({ type: 'warning', file: file, msg: `Broken internal link → posts/${target}` });
        }
      }
    }

    // Check image files reference existing files
    const imgDir = path.join(process.cwd(), 'public', 'images');
    const existingImages = new Set();
    if (fs.existsSync(imgDir)) {
      const walk = (dir) => { fs.readdirSync(dir).forEach(f => { const fp = path.join(dir, f); if (fs.statSync(fp).isDirectory()) walk(fp); else existingImages.add(fp.replace(imgDir, '').replace(/\\/g, '/')); }); };
      walk(imgDir);
    }
    for (const file of postFiles) {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
      const imgs = raw.match(/!\[.*?\]\(\/images\/([^)]+)\)/g);
      if (!imgs) continue;
      for (const img of imgs) {
        const src = '/' + img.match(/\/images\/[^)]+/)[0];
        const expectedPath = path.join(imgDir, src.replace('/images/', '')).replace(/\//g, path.sep);
        if (!fs.existsSync(expectedPath)) {
          issues.push({ type: 'warning', file: file.slice(0, 30), msg: `Missing image: ${src}` });
        }
      }
    }

    // Stats
    const checkCount = issues.length;
    const errors = issues.filter(i => i.type === 'error').length;
    const warnings = issues.filter(i => i.type === 'warning').length;
    const infos = issues.filter(i => i.type === 'info').length;

    return Response.json({
      issues,
      summary: { total: checkCount, errors, warnings, infos },
      stats: { posts: postFiles.length, images: existingImages.size },
      healthy: errors === 0,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

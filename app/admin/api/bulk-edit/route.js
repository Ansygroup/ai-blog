import fs from 'fs';
import path from 'path';
import { validateFrontmatter } from '@/lib/validate';
import { getRateLimitHeaders } from '@/lib/rate-limit';

export const revalidate = 60;
const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

export async function GET() {
  try {
    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
    const posts = [];

    for (const file of files) {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8').replace(/\r\n/g, '\n');
      const fm = raw.match(/^---\n([\s\S]*?)\n---/);
      if (!fm) continue;
      const get = (k) => { const m = fm[1].match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm')); return m ? m[1].trim() : ''; };
      posts.push({
        slug: file.replace(/\.mdx$/, ''),
        title: get('title'),
        draft: get('draft') === 'true',
        category: get('category'),
        date: get('date'),
        seoScore: parseInt(get('seoScore')) || 0,
      });
    }

    return Response.json({ posts });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const rl = getRateLimitHeaders(req);
    if (!rl.allowed) return Response.json({ error: `Too many requests. Retry in ${rl.retryAfter}s` }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });

    const { slugs, changes } = await req.json();
    if (!slugs || !Array.isArray(slugs) || !changes) {
      return Response.json({ error: 'slugs[] and changes object required' }, { status: 400 });
    }

    const validation = validateFrontmatter(changes);
    if (!validation.valid) {
      return Response.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 });
    }

    const results = [];

    for (const slug of slugs) {
      const fp = path.join(POSTS_DIR, `${slug}.mdx`);
      if (!fs.existsSync(fp)) { results.push({ slug, status: 'not-found' }); continue; }

      let raw = fs.readFileSync(fp, 'utf8').replace(/\r\n/g, '\n');
      const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
      if (!fmMatch) { results.push({ slug, status: 'no-frontmatter' }); continue; }

      let fm = fmMatch[1];
      const before = fm;

      for (const [key, value] of Object.entries(changes)) {
        const re = new RegExp(`^${key}:\\s*.*$`, 'm');
        const newLine = value === '' || value === null
          ? ''  // remove the key
          : `${key}: ${value}`;
        if (fm.match(re)) {
          fm = value === '' || value === null
            ? fm.replace(re, '').replace(/\n{2,}/g, '\n')
            : fm.replace(re, newLine);
        } else if (value !== '' && value !== null) {
          fm += `\n${newLine}`;
        }
      }

      if (fm === before) { results.push({ slug, status: 'unchanged' }); continue; }

      const newContent = raw.replace(fmMatch[1], fm);
      fs.writeFileSync(fp, newContent, 'utf8');
      results.push({ slug, status: 'updated', fields: Object.keys(changes) });
    }

    return Response.json({ results, total: results.length, updated: results.filter(r => r.status === 'updated').length });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

import fs from 'fs';
import path from 'path';
import { validateFrontmatter } from '@/lib/validate';
import { getRateLimitHeaders } from '@/lib/rate-limit';

export const revalidate = 60;

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

export async function GET() {
  try {
    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
    const catMap = {};
    const posts = [];

    for (const file of files) {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8').replace(/\r\n/g, '\n');
      const fm = raw.match(/^---\n([\s\S]*?)\n---/);
      if (!fm) continue;
      const get = (k) => { const m = fm[1].match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm')); return m ? m[1].trim() : ''; };
      const category = get('category') || 'Uncategorized';
      const title = get('title') || file.replace(/\.mdx$/, '');
      const slug = file.replace(/\.mdx$/, '');
      if (!catMap[category]) catMap[category] = { count: 0, posts: [] };
      catMap[category].count++;
      catMap[category].posts.push({ slug, title });
    }

    const categories = Object.entries(catMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);

    return Response.json({ categories, total: files.length });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const rl = getRateLimitHeaders(req);
    if (!rl.allowed) return Response.json({ error: `Too many requests. Retry in ${rl.retryAfter}s` }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });

    const { oldName, newName } = await req.json();
    if (!oldName || !newName) return Response.json({ error: 'oldName and newName required' }, { status: 400 });
    const v = validateFrontmatter({ category: newName });
    if (!v.valid) return Response.json({ error: v.errors[0] }, { status: 400 });

    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
    let modified = 0;

    for (const file of files) {
      const fp = path.join(POSTS_DIR, file);
      let raw = fs.readFileSync(fp, 'utf8');
      const categoryMatch = raw.match(/^category:\s*'?"?([^'"\n]*?)'?"?\s*$/m);
      if (!categoryMatch || categoryMatch[1] !== oldName) continue;
      const oldLine = categoryMatch[0];
      const newLine = oldLine.replace(oldName, newName);
      raw = raw.replace(oldLine, newLine);
      fs.writeFileSync(fp, raw, 'utf8');
      modified++;
    }

    return Response.json({ success: true, modified });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

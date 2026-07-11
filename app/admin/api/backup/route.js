import fs from 'fs';
import path from 'path';
import { logAction } from '@/lib/activity-log';
import { getRateLimitHeaders } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');
const BACKUP_DIR = path.join(process.cwd(), 'public', 'backups');

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'list') {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json')).sort().reverse();
      const backups = files.map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return { file: f, size: stat.size, date: stat.mtime.toISOString(), path: `/backups/${f}` };
      });
      return Response.json({ backups });
    }

    // Return all post data for export
    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
    const posts = [];

    for (const file of files) {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8').replace(/\r\n/g, '\n');
      const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (!match) continue;
      const fm = match[1];
      const body = match[2];
      const get = (k) => { const m = fm.match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm')); return m ? m[1].trim() : ''; };
      const tagsRaw = get('tags');
      const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim().replace(/^\[|\]$/g, '')).filter(Boolean) : [];

      posts.push({
        slug: file.replace(/\.mdx$/, ''),
        title: get('title'),
        excerpt: get('excerpt'),
        date: get('date'),
        lastUpdated: get('lastUpdated') || get('date'),
        category: get('category'),
        tags,
        seoScore: parseInt(get('seoScore')) || null,
        wordCount: body.split(/\s+/).filter(Boolean).length,
        draft: get('draft') === 'true',
        body: body.trim(),
      });
    }

    return Response.json({
      exportedAt: new Date().toISOString(),
      totalPosts: posts.length,
      totalWords: posts.reduce((s, p) => s + p.wordCount, 0),
      posts,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const rl = getRateLimitHeaders(req);
    if (!rl.allowed) return Response.json({ error: `Too many requests. Retry in ${rl.retryAfter}s` }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });

    const { action } = await req.json();

    if (action === 'save-backup') {
      // Fetch all posts and save to backup file
      const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
      const posts = [];

      for (const file of files) {
        const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8').replace(/\r\n/g, '\n');
        const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        if (!match) continue;
        const fm = match[1];
        const get = (k) => { const m = fm.match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm')); return m ? m[1].trim() : ''; };
        posts.push({ slug: file.replace(/\.mdx$/, ''), title: get('title'), date: get('date'), category: get('category') });
      }

      const backup = {
        exportedAt: new Date().toISOString(),
        totalPosts: posts.length,
        posts,
      };

      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      const fileName = `backup-${Date.now()}.json`;
      fs.writeFileSync(path.join(BACKUP_DIR, fileName), JSON.stringify(backup, null, 2), 'utf8');
      logAction('save-backup', { fileName, totalPosts: posts.length });

      return Response.json({ success: true, fileName, path: `/backups/${fileName}` });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

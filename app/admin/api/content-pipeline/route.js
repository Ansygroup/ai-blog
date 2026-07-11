import fs from 'fs';
import path from 'path';
import { logAction } from '@/lib/activity-log';
import { getRateLimitHeaders } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');
const IDEAS_PATH = path.join(process.cwd(), 'public', 'data', 'ideas.json');
const SCHEDULE_PATH = path.join(process.cwd(), 'public', 'data', 'schedule.json');

export async function GET() {
  try {
    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
    const ideas = fs.existsSync(IDEAS_PATH) ? JSON.parse(fs.readFileSync(IDEAS_PATH, 'utf8')) : [];
    const schedule = fs.existsSync(SCHEDULE_PATH) ? JSON.parse(fs.readFileSync(SCHEDULE_PATH, 'utf8')) : [];

    const pipeline = { ideas, drafts: [], scheduled: [], published: [] };

    for (const file of files) {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8').replace(/\r\n/g, '\n');
      const fm = raw.match(/^---\n([\s\S]*?)\n---/);
      if (!fm) continue;
      const get = (k) => { const m = fm[1].match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm')); return m ? m[1].trim() : ''; };
      const slug = file.replace(/\.mdx$/, '');
      const p = {
        slug,
        title: get('title') || slug,
        category: get('category') || '',
        wordCount: raw.split(/\s+/).length,
        date: get('date') || '',
        seoScore: parseInt(get('seoScore')) || null,
        draft: get('draft') === 'true',
      };

      const scheduled = schedule.find(s => s.slug === slug);
      if (p.draft) {
        if (scheduled) { p.scheduledDate = scheduled.date; pipeline.scheduled.push(p); }
        else { pipeline.drafts.push(p); }
      } else {
        pipeline.published.push(p);
      }
    }

    pipeline.drafts.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
    pipeline.scheduled.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    pipeline.published.sort((a, b) => b.date.localeCompare(a.date));

    return Response.json({
      pipeline,
      counts: {
        ideas: ideas.length,
        drafts: pipeline.drafts.length,
        scheduled: pipeline.scheduled.length,
        published: pipeline.published.length,
      },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const rl = getRateLimitHeaders(req);
    if (!rl.allowed) return Response.json({ error: `Too many requests. Retry in ${rl.retryAfter}s` }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });

    const { action, title, note } = await req.json();
    const ideasPath = IDEAS_PATH;

    if (action === 'add-idea') {
      if (!title) return Response.json({ error: 'title required' }, { status: 400 });
      const ideas = fs.existsSync(ideasPath) ? JSON.parse(fs.readFileSync(ideasPath, 'utf8')) : [];
      ideas.push({ id: Date.now(), title, note: note || '', createdAt: new Date().toISOString() });
      fs.writeFileSync(ideasPath, JSON.stringify(ideas, null, 2), 'utf8');
      logAction('add-idea', { title });
      return Response.json({ success: true, ideas });
    }

    if (action === 'delete-idea') {
      if (!title) return Response.json({ error: 'title required' }, { status: 400 });
      let ideas = fs.existsSync(ideasPath) ? JSON.parse(fs.readFileSync(ideasPath, 'utf8')) : [];
      ideas = ideas.filter(i => i.title !== title);
      fs.writeFileSync(ideasPath, JSON.stringify(ideas, null, 2), 'utf8');
      logAction('delete-idea', { title });
      return Response.json({ success: true, ideas });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

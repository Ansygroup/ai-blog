import fs from 'fs';
import path from 'path';
import { logAction } from '@/lib/activity-log';
import { getRateLimitHeaders } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');
const SCHEDULE_PATH = path.join(process.cwd(), 'public', 'data', 'schedule.json');

function getSchedule() {
  if (!fs.existsSync(SCHEDULE_PATH)) return [];
  return JSON.parse(fs.readFileSync(SCHEDULE_PATH, 'utf8'));
}

function saveSchedule(data) {
  fs.mkdirSync(path.dirname(SCHEDULE_PATH), { recursive: true });
  fs.writeFileSync(SCHEDULE_PATH, JSON.stringify(data, null, 2), 'utf8');
}

export async function GET() {
  try {
    const schedule = getSchedule();
    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
    const posts = [];

    for (const file of files) {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8').replace(/\r\n/g, '\n');
      const fm = raw.match(/^---\n([\s\S]*?)\n---/);
      if (!fm) continue;
      const get = (k) => { const m = fm[1].match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm')); return m ? m[1].trim() : ''; };
      const slug = file.replace(/\.mdx$/, '');
      const scheduled = schedule.find(s => s.slug === slug);
      posts.push({
        slug,
        title: get('title') || slug,
        category: get('category') || '',
        draft: get('draft') === 'true',
        seoScore: parseInt(get('seoScore')) || null,
        wordCount: raw.split(/\s+/).length,
        date: get('date') || '',
        scheduledDate: scheduled?.date || null,
      });
    }

    const scheduledPosts = posts.filter(p => p.scheduledDate).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    const draftPosts = posts.filter(p => p.draft && !p.scheduledDate);

    return Response.json({ posts, scheduledPosts, draftPosts, total: posts.length, scheduled: scheduledPosts.length });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const rl = getRateLimitHeaders(req);
    if (!rl.allowed) return Response.json({ error: `Too many requests. Retry in ${rl.retryAfter}s` }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });

    const { slug, scheduledDate, action, entries } = await req.json();
    let schedule = getSchedule();

    if (action === 'batch-schedule') {
      if (!entries || !Array.isArray(entries)) return Response.json({ error: 'entries[] required' }, { status: 400 });
      const results = [];
      for (const e of entries) {
        if (!e.slug || !e.date) continue;
        const existing = schedule.findIndex(s => s.slug === e.slug);
        const entry = { slug: e.slug, date: e.date, createdAt: new Date().toISOString() };
        if (existing >= 0) schedule[existing] = entry;
        else schedule.push(entry);
        results.push({ slug: e.slug, date: e.date });
      }
      saveSchedule(schedule);
      logAction('batch-schedule', { count: entries.length });
      return Response.json({ success: true, count: results.length, results });
    }

    if (action === 'schedule') {
      if (!slug || !scheduledDate) return Response.json({ error: 'slug and scheduledDate required' }, { status: 400 });
      const existing = schedule.findIndex(s => s.slug === slug);
      const entry = { slug, date: scheduledDate, createdAt: new Date().toISOString() };
      if (existing >= 0) schedule[existing] = entry;
      else schedule.push(entry);
      saveSchedule(schedule);
      logAction('schedule', { slug, date: scheduledDate, type: existing >= 0 ? 'rescheduled' : 'scheduled' });
      return Response.json({ success: true, entry });
    }

    if (action === 'unschedule') {
      if (!slug) return Response.json({ error: 'slug required' }, { status: 400 });
      schedule = schedule.filter(s => s.slug !== slug);
      saveSchedule(schedule);
      logAction('unschedule', { slug });
      return Response.json({ success: true });
    }

    if (action === 'publish') {
      if (!slug) return Response.json({ error: 'slug required' }, { status: 400 });
      const fp = path.join(POSTS_DIR, `${slug}.mdx`);
      if (!fs.existsSync(fp)) return Response.json({ error: 'Post not found' }, { status: 404 });
      let raw = fs.readFileSync(fp, 'utf8');
      raw = raw.replace(/^draft:\s*true\s*$/m, 'draft: false');
      fs.writeFileSync(fp, raw, 'utf8');
      schedule = schedule.filter(s => s.slug !== slug);
      saveSchedule(schedule);
      logAction('publish', { slug });
      return Response.json({ success: true, message: `"${slug}" published` });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

import fs from 'fs';
import path from 'path';
import { getAllPosts } from '@/lib/posts';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const dataPath = path.join(process.cwd(), 'public', 'data', 'social-schedule.json');

function getSchedule() {
  if (!fs.existsSync(dataPath)) return [];
  return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
}

function saveSchedule(schedule) {
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify(schedule, null, 2), 'utf8');
}

export async function GET() {
  try {
    const schedule = getSchedule();
    const posts = getAllPosts({ includeDrafts: true });
    const postMap = {};
    posts.forEach(p => { postMap[p.slug] = { title: p.title, excerpt: p.excerpt, date: p.date, category: p.category }; });

    return Response.json({
      schedule,
      total: schedule.length,
      pending: schedule.filter(s => s.status === 'pending').length,
      published: schedule.filter(s => s.status === 'published').length,
      posts: postMap,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (!body.postSlug || !body.scheduledDate) {
      return Response.json({ error: 'postSlug and scheduledDate are required' }, { status: 400 });
    }

    const item = {
      id: crypto.randomUUID(),
      postSlug: body.postSlug,
      platforms: Array.isArray(body.platforms) ? body.platforms : ['twitter', 'linkedin', 'facebook'],
      scheduledDate: body.scheduledDate,
      status: 'pending',
      customMessage: body.customMessage || '',
      createdAt: new Date().toISOString(),
    };

    const schedule = getSchedule();
    schedule.push(item);
    saveSchedule(schedule);

    return Response.json({ success: true, item, total: schedule.length });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { id } = await req.json();
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 });

    const schedule = getSchedule();
    const filtered = schedule.filter(s => s.id !== id);
    if (filtered.length === schedule.length) {
      return Response.json({ error: 'Item not found' }, { status: 404 });
    }

    saveSchedule(filtered);
    return Response.json({ success: true, total: filtered.length });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { mode } = await req.json();
    if (mode === 'bulk-generate') {
      const posts = getAllPosts({ includeDrafts: true });
      const schedule = getSchedule();
      const existingSlugs = new Set(schedule.map(s => s.postSlug));
      let created = 0;

      for (const post of posts) {
        if (existingSlugs.has(post.slug)) continue;
        if (post.draft) continue;
        if (!post.date) continue;

        const item = {
          id: crypto.randomUUID(),
          postSlug: post.slug,
          platforms: ['twitter', 'linkedin', 'facebook'],
          scheduledDate: new Date(Date.now() + 7 * 86400000 + Math.random() * 30 * 86400000).toISOString(),
          status: 'pending',
          customMessage: post.excerpt ? `Check out: ${post.title} — ${post.excerpt.slice(0, 100)}` : `New post: ${post.title}`,
          createdAt: new Date().toISOString(),
          bulkGenerated: true,
        };
        schedule.push(item);
        created++;
      }

      saveSchedule(schedule);
      return Response.json({ success: true, created, total: schedule.length });
    }

    return Response.json({ error: 'Unknown mode' }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json();
    if (!body.id) return Response.json({ error: 'id is required' }, { status: 400 });

    const schedule = getSchedule();
    const idx = schedule.findIndex(s => s.id === body.id);
    if (idx === -1) return Response.json({ error: 'Item not found' }, { status: 404 });

    if (body.platforms) schedule[idx].platforms = body.platforms;
    if (body.scheduledDate) schedule[idx].scheduledDate = body.scheduledDate;
    if (body.customMessage !== undefined) schedule[idx].customMessage = body.customMessage;
    if (body.status) schedule[idx].status = body.status;

    saveSchedule(schedule);
    return Response.json({ success: true, item: schedule[idx] });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

import { getAllSeries, saveSeries, getSeriesBySlug } from '../../../../lib/series';
import { getAllPosts } from '../../../../lib/posts';

export async function GET() {
  try {
    const series = getAllSeries();
    const posts = getAllPosts({ includeDrafts: true }).map(({ content, ...rest }) => rest);
    return Response.json({ series, posts });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const all = getAllSeries();

    if (body.action === 'create' || body.action === 'update') {
      const { slug, title, description, category, cover, posts } = body;
      if (!slug || !title) return Response.json({ error: 'slug and title required' }, { status: 400 });

      const existing = all.findIndex(s => s.slug === slug);
      const entry = { slug, title, description: description || '', category: category || '', cover: cover || '', posts: posts || [] };

      if (body.action === 'update' && existing >= 0) {
        all[existing] = entry;
      } else if (body.action === 'create' && existing >= 0) {
        return Response.json({ error: 'Series with this slug already exists' }, { status: 400 });
      } else {
        all.push(entry);
      }

      saveSeries(all);
      return Response.json({ success: true, series: all });
    }

    if (body.action === 'delete') {
      const idx = all.findIndex(s => s.slug === body.slug);
      if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 });
      all.splice(idx, 1);
      saveSeries(all);
      return Response.json({ success: true, series: all });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

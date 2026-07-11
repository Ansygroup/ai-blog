import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');
const SCHEDULE_PATH = path.join(process.cwd(), 'public', 'data', 'social-schedule.json');

export async function GET() {
  try {
    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
    const posts = [];

    for (const file of files) {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8').replace(/\r\n/g, '\n');
      const match = raw.match(/^---\n([\s\S]*?)\n---/);
      if (!match) continue;
      const fm = match[1];
      const get = (k) => {
        const r = new RegExp(`^${k}:\\s*"?(.+?)"?$`, 'm');
        const m = fm.match(r);
        return m ? m[1].replace(/^"|"$/g, '').trim() : '';
      };
      const title = get('title') || file.replace(/\.mdx$/, '');
      const date = get('date');
      const category = get('category') || 'Uncategorized';
      const lastUpdated = get('lastUpdated');
      if (!date) continue;
      posts.push({ title, slug: file.replace(/\.mdx$/, ''), date, category, lastUpdated });
    }

    // Load social schedule
    let socialSchedule = [];
    if (fs.existsSync(SCHEDULE_PATH)) {
      try {
        socialSchedule = JSON.parse(fs.readFileSync(SCHEDULE_PATH, 'utf8'));
      } catch {}
    }

    const socialByDate = {};
    socialSchedule.forEach(s => {
      const d = s.scheduledDate.slice(0, 10);
      if (!socialByDate[d]) socialByDate[d] = [];
      socialByDate[d].push(s);
    });

    const byDate = {};
    posts.forEach(p => {
      const d = p.date.slice(0, 10);
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(p);
    });

    const categories = [...new Set(posts.map(p => p.category))].sort();
    const months = [...new Set(posts.map(p => p.date.slice(0, 7)))].sort();
    const noDate = posts.filter(p => !p.date);

    const yearly = {};
    posts.forEach(p => {
      const year = p.date.slice(0, 4);
      if (!yearly[year]) yearly[year] = {};
      const cat = p.category;
      yearly[year][cat] = (yearly[year][cat] || 0) + 1;
    });

    return Response.json({
      posts,
      byDate,
      socialByDate,
      socialTotal: socialSchedule.length,
      socialPending: socialSchedule.filter(s => s.status === 'pending').length,
      categories,
      months,
      noDate: noDate.map(p => ({ title: p.title, slug: p.slug })),
      yearly,
      totalPosts: posts.length,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

import { getAllPosts } from '@/lib/posts';
import fs from 'fs';
import path from 'path';
import { getAllPostSlugs } from '@/lib/posts';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const posts = getAllPosts({ includeDrafts: true });
    const queuePath = path.join(process.cwd(), 'scripts', 'keyword-queue.json');
    const queue = fs.existsSync(queuePath) ? JSON.parse(fs.readFileSync(queuePath, 'utf8')) : [];
    const slugs = getAllPostSlugs();

    const scores = posts.map((p) => p.seoScore).filter(Boolean);
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 'N/A';

    const today = new Date().toISOString().split('T')[0];
    const todayPosts = posts.filter((p) => p.date === today);

    return Response.json({
      posts: { total: posts.length, published: posts.filter((p) => !p.draft).length, today: todayPosts.length },
      queue: { total: queue.length },
      seo: { avgScore, scored: scores.length },
      slugs: { total: slugs.length },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

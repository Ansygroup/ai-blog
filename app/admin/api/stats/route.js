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
    const needsImprovement = posts.filter((p) => p.seoScore && p.seoScore < 70).length;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const todayPosts = posts.filter((p) => p.date === todayStr);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStr = weekAgo.toISOString().split('T')[0];
    const weekPosts = posts.filter((p) => p.date && p.date >= weekStr);

    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthStr = monthAgo.toISOString().split('T')[0];
    const monthPosts = posts.filter((p) => p.date && p.date >= monthStr);

    const totalWords = posts.reduce((sum, p) => sum + (p.wordCount || p.content?.split(/\s+/).length || 0), 0);

    const linkCounts = posts.map((p) => (p.content?.match(/\[([^\]]+)\]\(([^)]+)\)/g) || []).filter((m) => !m.includes('://')).length);
    const totalInternalLinks = linkCounts.reduce((a, b) => a + b, 0);

    const queueStatus = queue.length > 20 ? 'full' : queue.length > 5 ? 'healthy' : 'low';

    const gitLog = fs.existsSync(path.join(process.cwd(), '.git'))
      ? ''
      : '';

    return Response.json({
      posts: {
        total: posts.length,
        published: posts.filter((p) => !p.draft).length,
        today: todayPosts.length,
        thisWeek: weekPosts.length,
        thisMonth: monthPosts.length,
      },
      queue: { total: queue.length, status: queueStatus },
      seo: { avgScore, scored: scores.length, needsImprovement },
      slugs: { total: slugs.length },
      words: { total: totalWords, avg: posts.length ? Math.round(totalWords / posts.length) : 0 },
      links: { total: totalInternalLinks, avgPerPost: posts.length ? (totalInternalLinks / posts.length).toFixed(1) : 0 },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

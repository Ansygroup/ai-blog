import { getAllPosts } from '@/lib/posts';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const posts = getAllPosts({ includeDrafts: true });

    const total = posts.length;
    const scores = posts.map((p) => p.seoScore).filter(Boolean);
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const needsImprovement = posts.filter((p) => p.seoScore && p.seoScore < 70);
    const distribution = { '0-40': 0, '40-60': 0, '60-80': 0, '80-100': 0 };
    scores.forEach((s) => {
      if (s < 40) distribution['0-40']++;
      else if (s < 60) distribution['40-60']++;
      else if (s < 80) distribution['60-80']++;
      else distribution['80-100']++;
    });

    return Response.json({
      avgScore,
      minScore: scores.length ? Math.min(...scores) : 0,
      maxScore: scores.length ? Math.max(...scores) : 0,
      total,
      scored: scores.length,
      needsImprovement: needsImprovement.length,
      distribution,
      posts: needsImprovement.map(({ content, ...rest }) => rest),
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

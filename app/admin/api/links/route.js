import { getAllPosts } from '@/lib/posts';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const posts = getAllPosts({ includeDrafts: true });

    const linkCounts = posts.map((p) => {
      const internalLinks = (p.content || '').match(/\[.*?\]\(\/(?!\/)/g) || [];
      return { slug: p.slug, title: p.title, count: internalLinks.length };
    });

    const totalLinks = linkCounts.reduce((sum, p) => sum + p.count, 0);
    const noLinks = linkCounts.filter((p) => p.count === 0);

    return Response.json({
      totalLinks,
      avgPerPost: posts.length ? Math.round(totalLinks / posts.length) : 0,
      postsWithLinks: posts.length - noLinks.length,
      postsWithoutLinks: noLinks.length,
      posts: noLinks.map(({ slug, title }) => ({ slug, title })),
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

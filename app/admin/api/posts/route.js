import { getAllPosts } from '@/lib/posts';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const posts = getAllPosts({ includeDrafts: true });
    return Response.json({
      posts: posts.map(({ content, ...rest }) => rest),
      total: posts.length,
      published: posts.filter((p) => !p.draft).length,
      drafts: posts.filter((p) => p.draft).length,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

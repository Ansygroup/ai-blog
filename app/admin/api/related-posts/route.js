import { NextResponse } from 'next/server';
import { getPostBySlug, getAllPosts } from '../../../../lib/posts';
import { groqJson } from '../../../../lib/groq';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  if (!slug) return NextResponse.json({ posts: [] });

  const current = getPostBySlug(slug);
  if (!current) return NextResponse.json({ posts: [] });

  const all = getAllPosts().filter((p) => p.slug !== slug);
  const candidates = all.slice(0, 20);

  const aiPosts = await groqJson(`Given this blog post:
Title: "${current.title}"
Category: "${current.category}"
Tags: ${JSON.stringify(current.tags || [])}
Excerpt: "${(current.excerpt || '').slice(0, 300)}"

Select the 3 most relevant posts from this list that would interest the same reader. Consider semantic relevance, complementary topics, and reader interest.

Return a JSON object with a "slugs" array containing exactly 3 slugs selected from: ${JSON.stringify(candidates.map(p => p.slug))}`, { temperature: 0.4 });

  if (aiPosts?.slugs?.length > 0) {
    const posts = aiPosts.slugs.map((s) => getPostBySlug(s)).filter(Boolean).slice(0, 3);
    if (posts.length > 0) return NextResponse.json({ posts, ai: true });
  }

  return NextResponse.json({ posts: [] });
}

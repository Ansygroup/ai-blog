export const dynamic = 'force-dynamic';

import { getPostBySlug, getAllPosts } from '../../../../lib/posts';
import { groqJson } from '../../../../lib/groq';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');

  if (slug) {
    const post = getPostBySlug(slug);
    if (!post) return Response.json({ error: 'Post not found' }, { status: 404 });
    return Response.json({ post: { ...post, content: post.content?.slice(0, 500) + '...' } });
  }

  const posts = getAllPosts({ includeDrafts: true });
  return Response.json({
    posts: posts.map(({ content, ...rest }) => ({ ...rest, wordCount: rest.readingTime * 220 })),
  });
}

export async function POST(req) {
  try {
    const { slug } = await req.json();
    if (!slug) return Response.json({ error: 'slug required' }, { status: 400 });

    const post = getPostBySlug(slug);
    if (!post) return Response.json({ error: 'Post not found' }, { status: 404 });

    const wordCount = post.content?.trim()?.split(/\s+/).length || 0;
    const ageDays = Math.floor((new Date() - new Date(post.date || Date.now())) / (1000 * 60 * 60 * 24));

    const issues = [];
    const recommendations = [];

    if (wordCount < 700) {
      issues.push({ type: 'thin-content', label: 'Thin Content', detail: `${wordCount} words (need 700+)`, severity: wordCount < 400 ? 'critical' : 'warning' });
      recommendations.push({ type: 'expand', label: 'Expand to 700+ words', page: 'posts', action: 'expand-thin' });
    }
    if (!post.excerpt || post.excerpt.length < 50 || post.excerpt.length > 200) {
      issues.push({ type: 'excerpt', label: 'Excerpt Issue', detail: post.excerpt ? `${post.excerpt.length} chars (need 120-160)` : 'Missing excerpt', severity: 'warning' });
      recommendations.push({ type: 'excerpt', label: 'Fix excerpt with AI', page: 'posts', action: 'fix-excerpts' });
    }
    if (ageDays > 180) {
      issues.push({ type: 'stale', label: 'Stale Content', detail: `Last updated ${ageDays} days ago`, severity: 'warning' });
      recommendations.push({ type: 'refresh', label: 'Refresh with AI', page: 'posts', action: 'refresh-content' });
    }
    if (!post.tags || post.tags.length < 2) {
      issues.push({ type: 'tags', label: 'Few Tags', detail: `${post.tags?.length || 0} tags (recommend 3-5)`, severity: 'info' });
    }

    const aiAnalysis = await groqJson(`Analyze this blog post. Return JSON with keys: overallScore (0-100), readability (good/average/poor), missingElements (array of strings, max 4), suggestedTags (array of strings, max 4), titleSuggestion (string or null).\n\nTitle: "${post.title}"\nCategory: "${post.category}"\nTags: ${JSON.stringify(post.tags || [])}\nExcerpt: "${(post.excerpt || '').slice(0, 200)}"\nWord count: ${wordCount}\nContent(first 800 chars): "${(post.content || '').slice(0, 800)}"`, { temperature: 0.3 });

    if (aiAnalysis) {
      (aiAnalysis.missingElements || []).forEach(el => {
        if (!issues.some(i => i.detail?.includes(el))) {
          issues.push({ type: 'ai-suggestion', label: el, detail: '', severity: 'info' });
        }
      });
    }

    return Response.json({
      slug: post.slug,
      title: post.title,
      wordCount,
      ageDays,
      category: post.category,
      tags: post.tags || [],
      excerpt: post.excerpt || '',
      readingTime: post.readingTime,
      overallScore: aiAnalysis?.overallScore ?? (wordCount >= 700 ? 70 : 40),
      readability: aiAnalysis?.readability || 'average',
      issues,
      recommendations,
      aiTitleSuggestion: aiAnalysis?.titleSuggestion || null,
      aiSuggestedTags: aiAnalysis?.suggestedTags || null,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

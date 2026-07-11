import { groqJson } from '@/lib/groq';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const postsDir = path.join(process.cwd(), 'content', 'posts');
    const postFiles = fs.existsSync(postsDir) ? fs.readdirSync(postsDir).filter(f => f.endsWith('.mdx')) : [];

    const posts = postFiles.map(f => {
      const c = fs.readFileSync(path.join(postsDir, f), 'utf8');
      const get = (k) => (c.match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm')) || [])[1] || '';
      const body = c.split('---').slice(2).join('---').trim();
      return {
        title: get('title'), category: get('category'), date: get('date'),
        tags: get('tags'), slug: f.replace(/\.mdx$/, ''),
        wordCount: body.split(/\s+/).filter(Boolean).length,
      };
    });

    const catCounts = {};
    posts.forEach(p => {
      const cat = p.category || 'Uncategorized';
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });

    const totalWords = posts.reduce((s, p) => s + p.wordCount, 0);
    const weakSeo = postFiles.filter(f => {
      const m = fs.readFileSync(path.join(postsDir, f), 'utf8').match(/^seoScore:\s*(\d+)/m);
      return m && parseInt(m[1]) < 70;
    }).length;

    const categoriesCovered = Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `${name}: ${count} posts`)
      .join('\n');

    const recentTitles = posts.sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 10)
      .map(p => `- "${p.title}" (${p.category})`).join('\n');

    const plan = await groqJson(`You are a content strategist. Generate a 4-week content plan for an AI blog.

Site stats:
- Total posts: ${posts.length}
- Categories:\n${categoriesCovered}
- Total words: ${(totalWords / 1000).toFixed(0)}k
- Posts with weak SEO: ${weakSeo}
- Recent titles:\n${recentTitles}

Generate a plan with 4 weeks. Each week has a theme and 5 post titles with categories.

Return JSON:
{
  "planTitle": "overall plan theme",
  "strategy": "1-2 sentence strategy",
  "weeks": [
    {
      "week": 1,
      "theme": "week theme",
      "focus": "what to focus on",
      "posts": [
        {
          "title": "SEO-optimized post title",
          "category": "category name",
          "description": "brief description",
          "targetLength": 1000-2500,
          "keywords": ["kw1", "kw2"],
          "trafficPotential": "high/medium/low"
        }
      ]
    }
  ]
}

Focus on high-traffic 2026 AI topics. Mix tutorials, reviews, comparisons, and news. Each week should have a distinct theme.`, {
      temperature: 0.5,
      maxTokens: 4096,
    });

    return Response.json({
      plan: plan || { planTitle: 'Could not generate', weeks: [] },
      stats: { totalPosts: posts.length, totalWords, weakSeo, categories: Object.keys(catCounts).length },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

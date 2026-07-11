import fs from 'fs';
import path from 'path';
import { groqJson } from '@/lib/groq';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const postsDir = path.join(process.cwd(), 'content', 'posts');
    const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.mdx'));
    const posts = files.map(f => {
      const c = fs.readFileSync(path.join(postsDir, f), 'utf8');
      const fm = c.match(/^---\r?\n([\s\S]+?)\r?\n---/);
      if (!fm) return null;
      const get = (k) => (fm[1].match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm')) || [])[1] || '';
      const tags = (fm[1].match(/^tags:\s*\[([^\]]+)\]/m) || [])[1]?.split(',').map(t => t.trim().replace(/['"]/g, '')) || [];
      const draft = get('draft') === 'true';
      return draft ? null : {
        category: get('category'), tags, title: get('title'),
        wordCount: c.split(/\s+/).length, date: get('date'),
        slug: f.replace(/\.mdx$/, ''),
      };
    }).filter(Boolean);

    const published = posts.filter(p => p.category);

    const cats = {};
    published.forEach(p => {
      const cat = p.category || 'Uncategorized';
      if (!cats[cat]) cats[cat] = { count: 0, totalWords: 0, latestDate: '2020-01-01', titles: [] };
      cats[cat].count++;
      cats[cat].totalWords += p.wordCount;
      if (p.date > cats[cat].latestDate) cats[cat].latestDate = p.date;
      cats[cat].titles.push(p.title);
    });
    const categories = Object.entries(cats)
      .map(([name, data]) => ({ name, ...data, avgWords: Math.round(data.totalWords / data.count) }))
      .sort((a, b) => b.count - a.count);

    const tagCounts = {};
    published.forEach(p => p.tags.forEach(t => {
      const key = t.toLowerCase().trim();
      if (key) tagCounts[key] = (tagCounts[key] || 0) + 1;
    }));
    const tags = Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const topCatCount = categories[0]?.count || 1;
    const gapThreshold = Math.round(topCatCount * 0.2);
    const gaps = categories
      .filter(c => c.count < gapThreshold && c.count <= 5)
      .map(c => ({
        name: c.name, count: c.count, avgWords: c.avgWords, latestDate: c.latestDate,
        gapLevel: c.count <= 1 ? 'critical' : c.count <= 3 ? 'high' : 'medium',
        suggestion: generateSuggestion(c.name, c.count),
      }));

    const topicGaps = [
      { topic: 'AI Image Generation', count: 8, target: 20, suggestion: 'Create comparisons of Midjourney vs DALL-E 4, image editing workflows, and prompt engineering guides.' },
      { topic: 'AI Voice & Music', count: 16, target: 25, suggestion: 'Cover Suno v4, ElevenLabs voice cloning, AI podcast production, and text-to-speech comparisons.' },
      { topic: 'AI Video Production', count: 21, target: 30, suggestion: 'Add Runway Gen-4 tutorials, Sora integration guides, and AI video editing workflow posts.' },
      { topic: 'AI Coding Tools', count: 25, target: 35, suggestion: 'Expand beyond Cursor — cover GitHub Copilot X, Windsurf, and Claude Code workflows.' },
      { topic: 'AI Agents', count: 12, target: 30, suggestion: 'Create content on AI agent frameworks, multi-agent systems, MCP protocol, and agentic RAG.' },
      { topic: 'AI for Business', count: 9, target: 25, suggestion: 'Cover AI in HR, sales automation, customer support AI, and enterprise AI strategy.' },
    ];

    // AI-powered gap analysis
    const allTitles = published.map(p => `- "${p.title}" (${p.category})`).join('\n');
    const catCoverage = categories.map(c => `${c.name}: ${c.count} posts`).join('\n');

    const aiGaps = await groqJson(`You are a content strategist. Analyze this blog's content and identify 5 specific content gaps — topics trending in AI that the blog barely covers or misses entirely.

Current categories and post counts:
${catCoverage}

Recent post titles (sample):
${allTitles.slice(0, 3000)}

For each gap, provide:
{
  "gaps": [
    {
      "topic": "specific topic name",
      "why_gap": "why this is missing and why it matters",
      "traffic_potential": "high/medium/low",
      "suggested_title": "example post title",
      "competitor_count": "approximate number of competing posts from search results"
    }
  ]
}

Return valid JSON only. Focus on 2026 trends in AI.`, { temperature: 0.4, maxTokens: 2048 });

    return Response.json({
      totalPosts: published.length,
      categories,
      tags: tags.slice(0, 50),
      gaps,
      topicGaps,
      aiGaps: aiGaps?.gaps || [],
      tagNormalization: {
        totalUnique: tags.length,
        singleUse: tags.filter(t => t.count === 1).length,
        recommendation: singleUseTags(tags),
      },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

function generateSuggestion(cat, count) {
  const map = {
    'Tutorials': 'Focus on high-demand topics: AI agents, MCP, RAG pipelines.',
    'AI News': 'Cover weekly AI roundups and breaking product launches.',
    'Best Of': 'Create more hardware roundups and tool comparisons.',
    'Comparisons': 'Compare emerging tools like Manus vs Devin, Windsurf vs Cursor.',
    'Reviews': 'Write deep-dive reviews of new AI tools with hands-on testing.',
    'AI Tools': 'Expand to cover specific categories: AI for HR, AI for sales, etc.',
    'AI Chatbots': 'Compare ChatGPT vs Claude vs Gemini across real tasks.',
    'AI Podcast': 'Create AI news podcasts and tool review episodes.',
    'AI Writing': 'Cover AI book writing, long-form content, and academic writing.',
    'AI Image Generation': 'Cover Midjourney v7, DALL-E 4, Stable Diffusion 4.',
    'AI Notes': 'Compare Notion AI, Mem, Reflect, and other AI note apps.',
    'AI Search': 'Cover Perplexity, Google AI Overviews, and search evolution.',
    'AI Video': 'Tutorials on AI video creation, editing, and production.',
    'AI Agents': 'Create content on agentic workflows, MCP, and multi-agent systems.',
  };
  return map[cat] || `Create more content in the ${cat} category to improve coverage.`;
}

function singleUseTags(tags) {
  const single = tags.filter(t => t.count === 1);
  return {
    count: single.length,
    examples: single.slice(0, 10).map(t => t.name),
    tip: `Consider normalizing these ${single.length} single-use tags into a controlled vocabulary of 50-80 high-value tags.`,
  };
}

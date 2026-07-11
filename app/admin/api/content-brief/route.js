import fs from 'fs';
import path from 'path';
import { groqJson } from '@/lib/groq';

export const dynamic = 'force-dynamic';

function loadAllPosts() {
  const postsDir = path.join(process.cwd(), 'content', 'posts');
  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.mdx'));
  return files.map(f => {
    const c = fs.readFileSync(path.join(postsDir, f), 'utf8');
    const fm = c.match(/^---\r?\n([\s\S]+?)\r?\n---/);
    if (!fm) return null;
    const get = (k) => (fm[1].match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm')) || [])[1] || '';
    const tags = (fm[1].match(/^tags:\s*\[([^\]]+)\]/m) || [])[1]?.split(',').map(t => t.trim().replace(/['"]/g, '')) || [];
    const body = c.slice(fm[0].length);
    return {
      slug: f.replace(/\.mdx$/, ''),
      title: get('title'),
      excerpt: get('excerpt'),
      category: get('category'),
      tags,
      wordCount: body.split(/\s+/).length,
      date: get('date'),
      hasFaq: body.includes('## FAQ'),
    };
  }).filter(Boolean);
}

function findRelatedPosts(posts, topic) {
  const topicLower = topic.toLowerCase();
  const topicWords = topicLower.split(/\s+/).filter(w => w.length > 2);

  return posts.filter(p => {
    const titleLower = p.title.toLowerCase();
    const excerptLower = (p.excerpt || '').toLowerCase();
    const tagMatch = p.tags.some(t => topicWords.some(w => t.toLowerCase().includes(w) || w.includes(t.toLowerCase())));
    const titleMatch = topicWords.some(w => titleLower.includes(w));
    const excerptMatch = topicWords.some(w => excerptLower.includes(w));
    return titleMatch || tagMatch || excerptMatch;
  }).sort((a, b) => {
    const aScore = topicWords.filter(w => a.title.toLowerCase().includes(w)).length * 3
      + topicWords.filter(w => (a.tags || []).join(' ').toLowerCase().includes(w)).length * 2
      + topicWords.filter(w => (a.excerpt || '').toLowerCase().includes(w)).length;
    const bScore = topicWords.filter(w => b.title.toLowerCase().includes(w)).length * 3
      + topicWords.filter(w => (b.tags || []).join(' ').toLowerCase().includes(w)).length * 2
      + topicWords.filter(w => (b.excerpt || '').toLowerCase().includes(w)).length;
    return bScore - aScore;
  });
}

const DEFAULT_STRUCTURE = [
  { heading: 'Introduction', description: 'Brief overview of what the post covers and why it matters.' },
  { heading: 'What is [Topic]', description: 'Definition and context.' },
  { heading: 'Why [Topic] Matters', description: 'Key benefits and importance.' },
  { heading: 'Key Features to Consider', description: 'If comparing tools: pricing, ease of use, features, support.' },
  { heading: 'Top [Topic] Tools/Resources', description: 'Ranked list with pros/cons for each.' },
  { heading: 'How to Choose', description: 'Decision framework for readers.' },
  { heading: 'Quick Answer', description: '2-3 sentence summary for featured snippets.' },
  { heading: 'Key Takeaways', description: '3-5 bullet points summarizing the post.' },
  { heading: 'FAQ', description: '4-6 common questions with answers.' },
];

export async function POST(req) {
  try {
    const { topic } = await req.json();
    if (!topic || topic.trim().length < 3) {
      return Response.json({ error: 'Topic must be at least 3 characters' }, { status: 400 });
    }

    const posts = loadAllPosts();
    const related = findRelatedPosts(posts, topic);
    const topicWords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    // Try AI first
    const aiResult = await groqJson(`You are an SEO content strategist. Generate a content brief for the topic "${topic}".

Existing posts on this site (${related.length} related out of ${posts.length} total):
${related.slice(0, 5).map(p => `- "${p.title}" (${p.category}, ${p.wordCount} words)`).join('\n')}

Available categories: ${[...new Set(posts.map(p => p.category).filter(Boolean))].join(', ')}
Available tags: ${[...new Set(posts.flatMap(p => p.tags))].slice(0, 20).join(', ')}

Return a JSON object with:
1. "suggestedTitle" — SEO-optimized title (include 2026, 30-65 chars)
2. "suggestedDescription" — meta description (150-160 chars)
3. "suggestedTags" — array of 3-5 relevant tags from the available tags list
4. "suggestedCategory" — best category for this topic
5. "suggestedQuestions" — array of 4-6 FAQ questions people would search for
6. "suggestedStructure" — array of objects with "heading" and "description" for 6-9 sections
7. "suggestedWordCount" — target word count (1200-2500)
8. "trafficPotential" — "high", "medium", or "low"
9. "reasoning" — 1-2 sentence explanation of why this topic matters for traffic`);

    if (aiResult) {
      return Response.json({
        topic,
        source: 'ai',
        existingPosts: related.length,
        existingCoverage: related.length > 0 ? 'covered' : 'gap',
        relatedPosts: related.slice(0, 8).map(p => ({
          title: p.title, slug: p.slug, category: p.category, wordCount: p.wordCount,
        })),
        categories: [...new Set(related.map(p => p.category).filter(Boolean))],
        ...aiResult,
      });
    }

    // Fallback: rule-based
    const tagCounts = {};
    related.forEach(p => p.tags.forEach(t => {
      const key = t.toLowerCase().trim();
      if (key) tagCounts[key] = (tagCounts[key] || 0) + 1;
    }));
    const suggestedTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name]) => name);

    const questions = [];
    related.filter(p => p.hasFaq).slice(0, 5).forEach(p => {
      const c = fs.readFileSync(path.join(process.cwd(), 'content', 'posts', p.slug + '.mdx'), 'utf8');
      const faqMatch = c.match(/##\s*FAQ[^\n]*\n([\s\S]+?)(?=\n##\s|\n#\s|$)/i);
      if (faqMatch) {
        const re = /###\s+(.+?)\n/g;
        let m;
        while ((m = re.exec(faqMatch[1])) !== null) {
          const q = m[1].trim();
          if (q.length > 10 && q.length < 150 && !questions.includes(q)) {
            questions.push(q);
          }
        }
      }
    });

    return Response.json({
      topic,
      source: 'rule',
      existingPosts: related.length,
      existingCoverage: related.length > 0 ? 'covered' : 'gap',
      relatedPosts: related.slice(0, 8).map(p => ({
        title: p.title, slug: p.slug, category: p.category, wordCount: p.wordCount,
      })),
      categories: [...new Set(related.map(p => p.category).filter(Boolean))],
      suggestedTags,
      suggestedQuestions: questions.slice(0, 10),
      suggestedStructure: DEFAULT_STRUCTURE,
      suggestedTitle: `Best ${topic} Tools 2026: ${related.length > 0 ? 'Updated Comparison' : 'Top Picks Reviewed'}`,
      suggestedDescription: `In-depth guide to the best ${topic.toLowerCase()} tools and resources for 2026. Compare features, pricing, and performance.`,
      suggestedCategory: related[0]?.category || 'AI News',
      suggestedWordCount: Math.min(Math.max(1200, topicWords.length * 200), 2500),
      trafficPotential: 'medium',
      reasoning: '',
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

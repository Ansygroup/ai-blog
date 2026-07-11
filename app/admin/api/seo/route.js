import { getAllPosts } from '@/lib/posts';
import { groqJson } from '@/lib/groq';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function analyzePostIssues(post) {
  const issues = [];
  if (!post.seoScore || post.seoScore < 40) issues.push({ type: 'critical', label: 'Very low SEO score', severity: 'high' });
  else if (post.seoScore && post.seoScore < 60) issues.push({ type: 'warning', label: 'Low SEO score', severity: 'medium' });
  if (!post.excerpt || post.excerpt.length < 100) issues.push({ type: 'error', label: 'Missing or short excerpt', severity: 'high' });
  else if (post.excerpt.length > 170) issues.push({ type: 'warning', label: 'Excerpt too long', severity: 'low' });
  if (post.wordCount && post.wordCount < 700) issues.push({ type: 'error', label: 'Thin content', severity: 'high' });
  else if (post.wordCount && post.wordCount < 1000) issues.push({ type: 'warning', label: 'Could use more content', severity: 'low' });
  if (!post.date) issues.push({ type: 'warning', label: 'No date set', severity: 'medium' });
  else {
    const monthsOld = (Date.now() - new Date(post.date).getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsOld > 12) issues.push({ type: 'warning', label: 'Over 1 year old — consider refresh', severity: 'medium' });
    else if (monthsOld > 6) issues.push({ type: 'info', label: 'Over 6 months old', severity: 'low' });
  }
  if (post.wordCount && post.wordCount > 3000) issues.push({ type: 'info', label: 'Very long post — consider splitting', severity: 'low' });

  const body = post.body || '';
  if (body && !body.includes('## FAQ') && !body.includes('## Frequently Asked')) {
    issues.push({ type: 'info', label: 'Missing FAQ section', severity: 'low' });
  }
  if (body && !body.includes('## ') && !body.includes('### ')) {
    issues.push({ type: 'warning', label: 'No subheadings', severity: 'medium' });
  }

  return issues;
}

function suggestActions(issues) {
  const actions = [];
  const seen = new Set();
  for (const issue of issues) {
    if (seen.has(issue.type)) continue;
    seen.add(issue.type);
    if (issue.label.includes('SEO score')) actions.push('seo-optimizer --fix');
    if (issue.label.includes('excerpt')) actions.push('fix-excerpts --ai');
    if (issue.label.includes('Thin') || issue.label.includes('more content')) actions.push('expand-thin-content');
    if (issue.label.includes('old') || issue.label.includes('refresh')) actions.push('content-refresher --ai');
    if (issue.label.includes('FAQ')) actions.push('seo-optimizer --fix');
    if (issue.label.includes('subheadings')) actions.push('seo-optimizer --fix');
  }
  return [...new Set(actions)].slice(0, 3);
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const glass = searchParams.get('glass') === 'true';

    const posts = getAllPosts({ includeDrafts: true });

    const total = posts.length;
    const scores = posts.map((p) => p.seoScore).filter(Boolean);
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const needsImprovement = posts.filter((p) => p.seoScore && p.seoScore < 70);
    const strong = posts.filter((p) => p.seoScore && p.seoScore >= 80);
    const moderate = posts.filter((p) => p.seoScore && p.seoScore >= 70 && p.seoScore < 80);

    const distribution = { '0-40': 0, '40-60': 0, '60-80': 0, '80-100': 0 };
    scores.forEach((s) => {
      if (s < 40) distribution['0-40']++;
      else if (s < 60) distribution['40-60']++;
      else if (s < 80) distribution['60-80']++;
      else distribution['80-100']++;
    });

    const categoryBreakdown = {};
    posts.forEach(p => {
      const cat = p.category || 'Uncategorized';
      if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { total: 0, scored: 0, sumScore: 0, weak: 0 };
      categoryBreakdown[cat].total++;
      if (p.seoScore) {
        categoryBreakdown[cat].scored++;
        categoryBreakdown[cat].sumScore += p.seoScore;
        if (p.seoScore < 70) categoryBreakdown[cat].weak++;
      }
    });
    Object.values(categoryBreakdown).forEach(c => {
      c.avgScore = c.scored ? Math.round(c.sumScore / c.scored) : 'N/A';
    });

    if (glass) {
      const postsWithAnalysis = needsImprovement.map(p => {
        const issues = analyzePostIssues(p);
        const actions = suggestActions(issues);
        return {
          slug: p.slug,
          title: p.title,
          category: p.category,
          seoScore: p.seoScore,
          wordCount: p.wordCount,
          date: p.date,
          issues,
          suggestedActions: actions,
        };
      });

      const queuePath = path.join(process.cwd(), 'scripts', 'keyword-queue.json');
      const queue = fs.existsSync(queuePath) ? JSON.parse(fs.readFileSync(queuePath, 'utf8')) : [];

      return Response.json({
        avgScore,
        minScore: scores.length ? Math.min(...scores) : 0,
        maxScore: scores.length ? Math.max(...scores) : 0,
        total,
        scored: scores.length,
        needsImprovement: needsImprovement.length,
        strong: strong.length,
        moderate: moderate.length,
        distribution,
        categoryBreakdown,
        posts: postsWithAnalysis,
        queueSize: queue.length,
        systemUptime: avgScore,
      });
    }

    return Response.json({
      avgScore,
      minScore: scores.length ? Math.min(...scores) : 0,
      maxScore: scores.length ? Math.max(...scores) : 0,
      total,
      scored: scores.length,
      needsImprovement: needsImprovement.length,
      distribution,
      posts: needsImprovement.map(({ body, content, ...rest }) => rest),
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function parseReport(content, fileName) {
  const date = content.match(/Generated:\s*(.+)/)?.[1] || fileName.replace(/^.*?-(\d{4}-\d{2}-\d{2})/, '$1');

  const score = parseInt(content.match(/\*\*Overall Score:\s*(\d+)\/100\*\*/)?.[1] || content.match(/SEO Readiness Score:\s*(\d+)%/)?.[1] || '0');
  const totalPosts = parseInt(content.match(/Total Posts[^|]*\|[^|]*\|?\s*(\d+)/)?.[1] || content.match(/\*\*Total Posts\*\*\s*[|]\s*(\d+)/)?.[1] || content.match(/Total published posts analyzed:\s*(\d+)/)?.[1] || '0');
  const totalWords = parseInt(content.match(/Total Words[^|]*\|[^|]*\|?\s*([\d,]+)/)?.[1]?.replace(/,/g, '') || content.match(/\*\*Total Words\*\*\s*[|]\s*([\d,]+)/)?.[1]?.replace(/,/g, '') || content.match(/Total words[^:]*:\s*([\d,]+)/)?.[1]?.replace(/,/g, '') || '0');
  const avgWords = parseInt(content.match(/Avg Words\/Post[^|]*\|[^|]*\|?\s*(\d+)/)?.[1] || content.match(/Avg words\/post[^:]*:\s*(\d+)/)?.[1] || '0');
  const strong = parseInt(content.match(/\*\*Strong\*\*[^|]*[|]\s*(\d+)/)?.[1] || '0');
  const needsImprovement = parseInt(content.match(/Needs Improvement[^|]*[|]\s*(\d+)/)?.[1] || content.match(/Needs Improvement[^|]*\|?\s*(\d+)/)?.[1] || '0');
  const weak = parseInt(content.match(/\*\*Weak\*\*[^|]*[|]\s*(\d+)/)?.[1] || content.match(/Weak[^|]*[|]\s*(\d+)/)?.[1] || '0');
  const thinContent = parseInt(content.match(/Thin content[^:]*:\s*(\d+)/)?.[1] || '0');
  const withFaq = parseInt(content.match(/Posts with FAQ[^|]*[|]\s*(\d+)/)?.[1] || content.match(/Posts with FAQ[^:]*:\s*(\d+)/)?.[1] || '0');

  const quickWins = [];
  const quickWinsSection = content.match(/## Quick Wins[\s\S]*?(?=## |$)/)?.[0] || '';
  const winLines = quickWinsSection.split('\n').filter(l => l.includes('/posts/'));
  for (const line of winLines) {
    const title = line.replace(/.*?\[([^\]]+)\].*/, '$1').trim();
    const slug = line.match(/\/posts\/([^)\s\]]+)/)?.[1] || '';
    const issues = line.match(/low SEO score|thin content|title too long|no FAQ/g) || [];
    if (title) quickWins.push({ title: title.replace(/^['"]|['"]$/g, ''), slug, issues: [...new Set(issues)] });
  }

  const weakest = [];
  const weakestSection = content.match(/## Weakest Posts[\s\S]*?(?=## |$)/)?.[0] || '';
  const weakLines = weakestSection.split('\n').filter(l => l.includes('/posts/'));
  for (const line of weakLines) {
    const title = line.replace(/.*?\[([^\]]+)\].*/, '$1').trim();
    const slug = line.match(/\/posts\/([^)\s\]]+)/)?.[1] || '';
    const scoreVal = parseInt(line.match(/\|\s*(\d+)\s*\|/)?.[1] || '0');
    const issues = (line.match(/low SEO score|thin content|title too long|no FAQ/g) || []).map(i => i.trim());
    if (title) weakest.push({ title: title.replace(/^['"]|['"]$/g, ''), slug, score: scoreVal, issues: [...new Set(issues)] });
  }

  const actions = [];
  const actionsSection = content.match(/## Recommended Actions[\s\S]*?(?=---|$)/)?.[0] || '';
  const actionLines = actionsSection.split('\n').filter(l => /^\d+\./.test(l));
  for (const line of actionLines) {
    actions.push(line.replace(/^\d+\.\s*\*{0,2}(.*?)\*{0,2}\s*$/, '$1').trim());
  }

  const categories = [];
  const catSection = content.match(/## Category Performance[\s\S]*?(?=## |$)/)?.[0] || '';
  const catLines = catSection.split('\n').filter(l => l.startsWith('|') && !l.includes('------') && !l.includes('Category'));
  for (const line of catLines) {
    const cells = line.split('|').filter(Boolean).map(c => c.trim());
    if (cells.length >= 6) {
      categories.push({
        name: cells[0].replace(/\n/g, '').trim(),
        posts: parseInt(cells[1]) || 0,
        strong: parseInt(cells[2]) || 0,
        needsWork: parseInt(cells[3]) || 0,
        weak: parseInt(cells[4]) || 0,
        avgSeo: parseInt(cells[5]) || 0,
      });
    }
  }

  return {
    file: fileName,
    date,
    score,
    totalPosts,
    totalWords,
    avgWords,
    strong,
    needsImprovement,
    weak,
    thinContent,
    withFaq,
    quickWins: quickWins.slice(0, 10),
    weakest: weakest.slice(0, 15),
    actions: actions.slice(0, 8),
    categories,
  };
}

function parseAnalyticsReport(content, fileName) {
  const date = content.match(/Generated:\s*(.+)/)?.[1] || fileName.replace(/^.*?-(\d{4}-\d{2}-\d{2})/, '$1');
  const totalPosts = parseInt(content.match(/\*\*Total posts:\*\*\s*(\d+)/)?.[1] || '0');
  const totalWords = parseInt(content.match(/\*\*Total words:\*\*\s*([\d,]+)/)?.[1]?.replace(/,/g, '') || '0');
  const withFaq = parseInt(content.match(/Posts with FAQ[^:]*:\s*(\d+)/)?.[1] || '0');
  const seoScore = parseInt(content.match(/SEO Readiness Score:\s*(\d+)%/)?.[1] || '0');

  const categories = [];
  const catSection = content.match(/## 📂 Categories[\s\S]*?(?=## |$)/)?.[0] || '';
  const catLines = catSection.split('\n').filter(l => l.startsWith('|') && !l.includes('------') && !l.includes('Category'));
  for (const line of catLines) {
    const cells = line.split('|').filter(Boolean).map(c => c.trim());
    if (cells.length >= 2) categories.push({ name: cells[0], count: parseInt(cells[1]) || 0 });
  }

  return { file: fileName, date, totalPosts, totalWords, withFaq, seoScore, categories };
}

export async function GET() {
  try {
    const reportsDir = path.join(process.cwd(), 'public', 'reports');
    if (!fs.existsSync(reportsDir)) {
      return Response.json({ latest: null, reports: [], history: [] });
    }

    const allFiles = fs.readdirSync(reportsDir).filter(f => f.endsWith('.md')).sort().reverse();

    const perfFiles = allFiles.filter(f => f.startsWith('performance-'));
    const analyticsFiles = allFiles.filter(f => f.startsWith('analytics-'));

    const latestPerf = perfFiles.length > 0
      ? parseReport(fs.readFileSync(path.join(reportsDir, perfFiles[0]), 'utf8'), perfFiles[0])
      : null;

    const history = perfFiles.map(f => {
      const c = fs.readFileSync(path.join(reportsDir, f), 'utf8');
      return parseReport(c, f);
    }).filter(r => r.score > 0).slice(0, 10);

    const latestAnalytics = analyticsFiles.length > 0
      ? parseAnalyticsReport(fs.readFileSync(path.join(reportsDir, analyticsFiles[0]), 'utf8'), analyticsFiles[0])
      : null;

    return Response.json({
      latest: latestPerf,
      latestAnalytics,
      reports: perfFiles.map(f => ({ file: f, date: f.replace('performance-', '').replace('.md', '') })),
      history,
      scoreTrend: history.map(h => ({ date: h.date.slice(0, 10), score: h.score, totalPosts: h.totalPosts })),
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

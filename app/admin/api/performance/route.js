import fs from 'fs';
import path from 'path';

export const revalidate = 300;

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');
const REPORTS_DIR = path.join(process.cwd(), 'public', 'reports');

export async function GET() {
  try {
    const files = fs.readdirSync(REPORTS_DIR).filter(f => f.startsWith('performance-'));
    const reports = files.sort().reverse().map(f => ({
      file: f,
      date: fs.statSync(path.join(REPORTS_DIR, f)).mtime.toISOString(),
      size: fs.statSync(path.join(REPORTS_DIR, f)).size,
      content: fs.readFileSync(path.join(REPORTS_DIR, f), 'utf8'),
    }));

    const postFiles = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
    const posts = [];

    for (const file of postFiles) {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8').replace(/\r\n/g, '\n');
      const fm = raw.match(/^---\n([\s\S]*?)\n---/);
      if (!fm) continue;
      const get = (k) => { const m = fm[1].match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm')); return m ? m[1].trim() : ''; };
      const body = raw.slice(fm[0].length).trim();
      const seoScore = parseInt(get('seoScore')) || 0;
      const draft = get('draft') === 'true';
      const wordCount = body.split(/\s+/).filter(Boolean).length;

      let classification = 'needs-improvement';
      if (seoScore >= 80 && wordCount >= 1500) classification = 'strong';
      else if (seoScore < 40 || wordCount < 600) classification = 'weak';

      const issues = [];
      if (seoScore < 60) issues.push('low SEO score');
      if (wordCount < 800) issues.push('thin content');
      if ((get('title') || '').length > 70) issues.push('title too long');
      if (!get('excerpt')) issues.push('missing excerpt');
      else if (get('excerpt').length < 120 || get('excerpt').length > 160) issues.push('excerpt length issue');

      posts.push({
        slug: file.replace(/\.mdx$/, ''),
        title: get('title') || slug,
        category: get('category') || '',
        draft,
        seoScore,
        wordCount,
        classification,
        issues,
        excerpt: get('excerpt') || '',
      });
    }

    const published = posts.filter(p => !p.draft);
    const strong = published.filter(p => p.classification === 'strong').length;
    const needsWork = published.filter(p => p.classification === 'needs-improvement').length;
    const weak = published.filter(p => p.classification === 'weak').length;
    const totalWords = published.reduce((s, p) => s + p.wordCount, 0);
    const quickWins = published.filter(p => p.classification === 'weak' && p.issues.length <= 2).sort((a, b) => a.seoScore - b.seoScore).slice(0, 15);

    return Response.json({
      reports: reports.slice(0, 5),
      latestReport: reports[0]?.content || '',
      stats: {
        totalPosts: published.length,
        strong, needsWork, weak,
        totalWords,
        avgWords: Math.round(totalWords / published.length) || 0,
        thinContent: published.filter(p => p.wordCount < 800).length,
      },
      published: published.sort((a, b) => a.seoScore - b.seoScore).slice(0, 50),
      quickWins,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

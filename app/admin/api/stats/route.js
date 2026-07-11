import fs from 'fs';
import path from 'path';
import { computeSeoScore } from '@/lib/seo-score';

export const revalidate = 300;
const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

export async function GET() {
  try {
    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
    const months = {};
    const days = {};
    let totalWords = 0;
    const categories = {};
    const seoScores = [];
    let draftCount = 0;
    let withExcerpt = 0;
    let withoutExcerpt = 0;

    for (const file of files) {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8').replace(/\r\n/g, '\n');
      const fm = raw.match(/^---\n([\s\S]*?)\n---/);
      if (!fm) continue;
      const get = (k) => { const m = fm[1].match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm')); return m ? m[1].trim() : ''; };
      const body = raw.slice(fm[0].length).trim();
      const wc = body.split(/\s+/).filter(Boolean).length;
      totalWords += wc;
      const draft = get('draft') === 'true';
      if (draft) draftCount++;
      if (get('excerpt')) withExcerpt++;
      else withoutExcerpt++;

      const date = get('date') || '';
      if (date) {
        const m = date.slice(0, 7);
        months[m] = (months[m] || 0) + 1;
        days[date] = (days[date] || 0) + 1;
      }

      const cat = get('category') || 'Uncategorized';
      categories[cat] = (categories[cat] || 0) + 1;

      const seoResult = computeSeoScore({
        title: get('title'),
        excerpt: get('excerpt'),
        body,
        slug: file.replace(/\.mdx$/, ''),
        category: cat,
        tags: get('tags'),
        date,
      });
      seoScores.push(seoResult.score);
    }

    const published = files.length - draftCount;
    const avgWords = published ? Math.round(totalWords / published) : 0;
    const avgSeo = seoScores.length ? Math.round(seoScores.reduce((a, b) => a + b, 0) / seoScores.length) : 0;
    const topCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const monthlyTrend = Object.entries(months).sort((a, b) => a[0].localeCompare(b[0]));

    // Heatmap: last 365 days
    const now = new Date();
    const heatmap = [];
    for (let i = 364; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      heatmap.push({ date: key, count: days[key] || 0, day: d.getDay() });
    }

    // Streak
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const sortedDays = Object.entries(days).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [, count] of sortedDays) {
      if (count > 0) { tempStreak++; longestStreak = Math.max(longestStreak, tempStreak); }
      else tempStreak = 0;
    }
    // Current streak (trailing)
    for (let i = heatmap.length - 1; i >= 0; i--) {
      if (heatmap[i].count > 0) currentStreak++;
      else break;
    }

    return Response.json({
      totalPosts: files.length,
      published,
      drafts: draftCount,
      totalWords,
      avgWords,
      avgSeo,
      withExcerpt,
      withoutExcerpt,
      topCategories,
      monthlyTrend,
      currentStreak,
      longestStreak,
      heatmap,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

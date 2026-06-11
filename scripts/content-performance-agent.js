#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const REPORTS_DIR = path.join(__dirname, '..', 'public', 'reports');
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = 'llama-3.3-70b-versatile';

function getPostData() {
  return fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx')).map(f => {
    const c = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8');
    const slug = f.replace(/\.mdx$/, '');
    const fm = c.match(/^---\r?\n([\s\S]+?)\r?\n---/);
    if (!fm) return null;
    const get = (k) => (fm[1].match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm')) || [])[1] || '';
    const body = c.slice(fm[0].length).trim();
    const seoScore = parseInt(get('seoScore')) || 0;
    const tags = (fm[1].match(/^tags:\s*\[([^\]]+)\]/m) || [])[1]?.split(',').map(t => t.trim().replace(/['"]/g, '')) || [];
    const draft = get('draft') === 'true';
    return {
      slug, title: get('title') || slug, excerpt: get('excerpt'), date: get('date'),
      lastUpdated: get('lastUpdated'), category: get('category'), tags, draft,
      seoScore, wordCount: body.split(/\s+/).length,
      h2Count: (body.match(/^## /gm) || []).length,
      hasFaq: body.includes('## FAQ'),
      hasQuickAnswer: body.includes('Quick Answer'),
      hasKeyTakeaways: body.includes('Key Takeaways'),
      hasYear: /\b2026\b/.test(get('title') || ''),
      titleLength: (get('title') || '').length,
    };
  }).filter(Boolean).filter(p => !p.draft);
}

function classifyPost(p) {
  let score = 0;
  const reasons = [];

  if (p.seoScore >= 80) { score += 30; }
  else if (p.seoScore >= 60) { score += 15; }
  else { score -= 10; reasons.push('low SEO score'); }

  if (p.wordCount >= 1500) { score += 20; }
  else if (p.wordCount >= 1000) { score += 10; }
  else { score -= 15; reasons.push('thin content'); }

  if (p.hasFaq) { score += 15; }
  else { reasons.push('missing FAQ'); }

  if (p.hasQuickAnswer) { score += 10; }
  else if (p.h2Count < 4 && p.wordCount > 500) { reasons.push('no Quick Answer, few headings'); }

  if (p.hasKeyTakeaways) { score += 10; }

  if (p.hasYear) { score += 5; }
  else { reasons.push('no year in title'); }

  if (p.titleLength >= 30 && p.titleLength <= 65) { score += 10; }
  else if (p.titleLength > 65) { reasons.push('title too long'); }
  else if (p.titleLength < 20) { reasons.push('title too short'); }

  if (p.h2Count >= 5) { score += 5; }
  else if (p.h2Count < 3 && p.wordCount > 800) { reasons.push('too few H2 headings'); }

  const daysSincePublish = Math.floor((Date.now() - new Date(p.date || '2026-01-01').getTime()) / 86400000);
  if (!p.lastUpdated && daysSincePublish > 120) { score -= 10; reasons.push('stale — no update in 4+ months'); }

  let classification;
  if (score >= 60) classification = 'strong';
  else if (score >= 30) classification = 'needs-improvement';
  else classification = 'weak';

  return { score, classification, reasons };
}

async function getGroqRecommendations(posts) {
  const weakPosts = posts.filter(p => p.classification !== 'strong').slice(0, 15);
  if (weakPosts.length === 0 || !GROQ_API_KEY) return [];

  const results = [];

  for (const p of weakPosts) {
    const prompt = `You are an SEO content strategist. Analyze this blog post and give 2-3 specific, actionable recommendations to improve its search traffic.

Title: ${p.title}
Category: ${p.category}
SEO Score: ${p.seoScore}/100
Word Count: ${p.wordCount}
Headings: ${p.h2Count}
Has FAQ: ${p.hasFaq}
Has Quick Answer: ${p.hasQuickAnswer}
Has Key Takeaways: ${p.hasKeyTakeaways}
Issues: ${(p.reasons || []).join(', ')}

Respond with ONLY a JSON array of 2-3 objects, each with "action" (what to do) and "impact" (high/medium/low). Example:
[{"action": "Add FAQ section targeting featured snippets for 'how to' queries", "impact": "high"}]`;

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: GROQ_MODEL, messages: [{ role: 'user', content: prompt }],
          temperature: 0.3, max_tokens: 500,
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      const recs = JSON.parse(content);
      results.push({ slug: p.slug, title: p.title, recommendations: Array.isArray(recs) ? recs : [] });
    } catch { /* groq failure is non-fatal */ }

    await new Promise(r => setTimeout(r, 200));
  }

  return results;
}

function generateReport(posts, classifications, groqRecs) {
  const formatDate = (d) => d ? new Date(d).toISOString().split('T')[0] : '—';

  const lines = [];
  lines.push('# Content Performance Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Total published posts analyzed: ${posts.length}`);
  lines.push(`Groq API: ${GROQ_API_KEY ? '✅ Available' : '⚠️ Not configured (recommendations limited to rule-based)'}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Overview');
  lines.push('');

  const strong = classifications.filter(c => c.classification === 'strong').length;
  const needsWork = classifications.filter(c => c.classification === 'needs-improvement').length;
  const weak = classifications.filter(c => c.classification === 'weak').length;
  const hasFaq = posts.filter(p => p.hasFaq).length;
  const hasQA = posts.filter(p => p.hasQuickAnswer).length;
  const hasKT = posts.filter(p => p.hasKeyTakeaways).length;
  const totalWords = posts.reduce((s, p) => s + p.wordCount, 0);
  const hasYear = posts.filter(p => p.hasYear).length;
  const thinContent = posts.filter(p => p.wordCount < 800).length;
  const staleNoUpdate = posts.filter(p => {
    const days = Math.floor((Date.now() - new Date(p.date || '2026-01-01').getTime()) / 86400000);
    return !p.lastUpdated && days > 120;
  }).length;

  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| **Total Posts** | ${posts.length} |`);
  lines.push(`| **Strong** 🟢 | ${strong} (${Math.round(strong/posts.length*100)}%) |`);
  lines.push(`| **Needs Improvement** 🟡 | ${needsWork} (${Math.round(needsWork/posts.length*100)}%) |`);
  lines.push(`| **Weak** 🔴 | ${weak} (${Math.round(weak/posts.length*100)}%) |`);
  lines.push(`| **Total Words** | ${totalWords.toLocaleString()} |`);
  lines.push(`| **Avg Words/Post** | ${Math.round(totalWords/posts.length)} |`);
  lines.push(`| **Posts with FAQ** | ${hasFaq} (${Math.round(hasFaq/posts.length*100)}%) |`);
  lines.push(`| **Posts with Quick Answer** | ${hasQA} (${Math.round(hasQA/posts.length*100)}%) |`);
  lines.push(`| **Posts with Key Takeaways** | ${hasKT} (${Math.round(hasKT/posts.length*100)}%) |`);
  lines.push(`| **Posts with year in title** | ${hasYear} (${Math.round(hasYear/posts.length*100)}%) |`);
  lines.push(`| **Thin content (<800 words)** | ${thinContent} |`);
  lines.push(`| **Stale (no update, 4+ months)** | ${staleNoUpdate} |`);
  lines.push('');

  lines.push('---');
  lines.push('');

  // Traffic opportunity assessment
  lines.push('## Traffic Opportunity Score');
  lines.push('');
  const oppScore = Math.round(
    (strong / posts.length) * 30 +
    (hasFaq / posts.length) * 20 +
    (hasQA / posts.length) * 15 +
    (hasYear / posts.length) * 10 +
    (1 - thinContent / posts.length) * 15 +
    (1 - staleNoUpdate / posts.length) * 10
  );
  lines.push(`**Overall Score: ${oppScore}/100**`);
  lines.push('');
  if (oppScore < 40) lines.push('⚠️ Major content improvement needed to compete for search traffic.');
  else if (oppScore < 60) lines.push('🟡 Moderate — focus on fixing weak posts and adding FAQ sections.');
  else if (oppScore < 80) lines.push('🟢 Good — fine-tune with Quick Answers and year updates.');
  else lines.push('✅ Strong — maintain with regular refreshes.');
  lines.push('');

  lines.push('---');
  lines.push('');

  // Category breakdown
  lines.push('## Category Performance');
  lines.push('');
  const cats = {};
  posts.forEach(p => {
    const cat = p.category || 'Uncategorized';
    if (!cats[cat]) cats[cat] = { total: 0, strong: 0, needsWork: 0, weak: 0, avgSeo: 0, sumSeo: 0 };
    const cl = classifications.find(c => c.slug === p.slug)?.classification || 'weak';
    cats[cat].total++;
    cats[cat][cl === 'strong' ? 'strong' : cl === 'needs-improvement' ? 'needsWork' : 'weak']++;
    cats[cat].sumSeo += p.seoScore;
  });
  Object.values(cats).forEach(c => c.avgSeo = Math.round(c.sumSeo / c.total));
  lines.push('| Category | Posts | Strong | Needs Work | Weak | Avg SEO |');
  lines.push('|----------|-------|--------|------------|------|---------|');
  Object.entries(cats).sort((a, b) => b[1].total - a[1].total).forEach(([cat, c]) => {
    lines.push(`| ${cat} | ${c.total} | ${c.strong} | ${c.needsWork} | ${c.weak} | ${c.avgSeo} |`);
  });
  lines.push('');

  lines.push('---');
  lines.push('');

  // Quick wins — posts with highest potential
  lines.push('## Quick Wins (High Impact, Low Effort)');
  lines.push('');
  const quickWins = classifications
    .filter(c => c.classification === 'needs-improvement' && c.reasons.length <= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  if (quickWins.length > 0) {
    lines.push('| Post | Issues |');
    lines.push('|------|--------|');
    quickWins.forEach(c => {
      const p = posts.find(pp => pp.slug === c.slug);
      lines.push(`| [${p?.title || c.slug}](/posts/${c.slug}) | ${c.reasons.join(', ')} |`);
    });
  } else {
    lines.push('No quick wins found.');
  }
  lines.push('');

  lines.push('---');
  lines.push('');

  // Weak posts that need the most help
  lines.push('## Weakest Posts (Priority Fixes)');
  lines.push('');
  const weakest = classifications.filter(c => c.classification === 'weak').sort((a, b) => a.score - b.score).slice(0, 15);
  if (weakest.length > 0) {
    lines.push('| Post | Score | Issues |');
    lines.push('|------|-------|--------|');
    weakest.forEach(c => {
      const p = posts.find(pp => pp.slug === c.slug);
      lines.push(`| [${p?.title || c.slug}](/posts/${c.slug}) | ${c.score} | ${c.reasons.join(', ')} |`);
    });
  } else {
    lines.push('No weak posts — all posts meet quality thresholds.');
  }
  lines.push('');

  // Groq recommendations
  if (groqRecs.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## AI-Generated Recommendations');
    lines.push('');
    for (const rec of groqRecs) {
      lines.push(`### [${rec.title}](/posts/${rec.slug})`);
      lines.push('');
      for (const r of rec.recommendations) {
        const icon = r.impact === 'high' ? '🔴' : r.impact === 'medium' ? '🟡' : '🟢';
        lines.push(`- ${icon} **${r.impact} impact:** ${r.action}`);
      }
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');
  lines.push('## Recommended Actions (Priority Order)');
  lines.push('');
  lines.push('1. **Fix weakest posts** — Expand thin content, add FAQ sections, improve titles');
  lines.push('2. **Add Quick Answer sections** — Boost featured snippet / AI overview visibility');
  lines.push('3. **Update stale posts** — Refresh content, add year to titles');
  lines.push('4. **Expand underserved categories** — More depth in low-post categories');
  lines.push('5. **Add Key Takeaways** — Improve user engagement signals');
  lines.push('6. **Run SEO optimizer** — `node scripts/seo-optimizer.js --fix --ai-fix`');
  lines.push('7. **Re-optimize internal links** — `node scripts/auto-internal-link.js`');
  lines.push('');
  lines.push('---');
  lines.push('*Auto-generated by Content Performance Agent*');

  return lines.join('\n');
}

(async () => {
  console.log('📊 Content Performance Agent');
  console.log('');

  const posts = getPostData();
  console.log(`Found ${posts.length} published posts`);
  console.log('');

  const classifications = posts.map(p => ({ slug: p.slug, ...classifyPost(p) }));
  const strong = classifications.filter(c => c.classification === 'strong').length;
  const needsWork = classifications.filter(c => c.classification === 'needs-improvement').length;
  const weak = classifications.filter(c => c.classification === 'weak').length;
  console.log(`Classification: 🟢 ${strong} strong, 🟡 ${needsWork} needs work, 🔴 ${weak} weak`);
  console.log('');

  let groqRecs = [];
  if (GROQ_API_KEY) {
    console.log('🤖 Generating AI recommendations via Groq...');
    groqRecs = await getGroqRecommendations(posts.map((p, i) => ({ ...p, ...classifications[i] })));
    console.log(`Got recommendations for ${groqRecs.length} posts`);
    console.log('');
  } else {
    console.log('⚠️ No GROQ_API_KEY — skipping AI recommendations');
    console.log('');
  }

  const report = generateReport(posts, classifications, groqRecs);
  const reportPath = path.join(REPORTS_DIR, `performance-${new Date().toISOString().split('T')[0]}.md`);
  fs.writeFileSync(reportPath, report, 'utf8');

  console.log(`✅ Report saved: ${reportPath}`);

  const oppScore = Math.round(
    (strong / posts.length) * 30 +
    (posts.filter(p => p.hasFaq).length / posts.length) * 20 +
    (posts.filter(p => p.hasQuickAnswer).length / posts.length) * 15 +
    (posts.filter(p => p.hasYear).length / posts.length) * 10 +
    (1 - posts.filter(p => p.wordCount < 800).length / posts.length) * 15 +
    (1 - posts.filter(p => {
      const days = Math.floor((Date.now() - new Date(p.date || '2026-01-01').getTime()) / 86400000);
      return !p.lastUpdated && days > 120;
    }).length / posts.length) * 10
  );
  console.log(`📈 Traffic Opportunity: ${oppScore}/100`);
  console.log('Done.');
})();

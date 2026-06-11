#!/usr/bin/env node
/**
 * scripts/seo-optimizer.js
 *
 * AI-powered SEO optimizer. Analyzes all posts and applies fixes:
 *   - Title length (30-65 chars)
 *   - Meta description length (150-165 chars)
 *   - Missing/weak excerpt
 *   - Missing FAQ sections (adds one via AI)
 *   - Heading structure (H1/H2 balance)
 *   - Missing "2026" in titles (freshness signal)
 *   - Weak/stale content flags
 *
 * Usage:
 *   node scripts/seo-optimizer.js              # preview fixes
 *   node scripts/seo-optimizer.js --fix        # apply fixes
 *   node scripts/seo-optimizer.js --ai-fix     # use AI to fix content
 */
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');

function getPostData(file) {
  const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
  const slug = file.replace(/\.mdx?$/, '');
  const parsed = matter(content);
  const { data, content: body } = parsed;

  return {
    file, slug, content,
    fm: null, body,
    title: data.title || '',
    excerpt: data.excerpt || '',
    description: data.description || '',
    date: data.date || '',
    lastUpdated: data.lastUpdated || '',
    author: data.author || '',
    category: data.category || '',
    tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || ''),
    cover: data.cover || '',
    rating: data.rating || '',
    draft: data.draft || '',
    wordCount: body.trim().split(/\s+/).length,
    h2s: (body.match(/^## /gm) || []).length,
    hasFaq: /^##\s*FAQ/m.test(body),
  };
}

function suggestFixes(post) {
  const fixes = [];

  // Title checks
  if (!post.title) { fixes.push({ field: 'title', issue: 'Missing title', severity: 'high' }); }
  else if (post.title.length < 25) { fixes.push({ field: 'title', issue: `Too short (${post.title.length} chars, min 25)`, suggestion: `Consider adding more detail. Current: "${post.title}"`, severity: 'medium' }); }
  else if (post.title.length > 65) { fixes.push({ field: 'title', issue: `Too long (${post.title.length} chars, max 65)`, suggestion: `Trim title. Current: "${post.title}"`, severity: 'medium' }); }

  // Year freshness
  if (post.title && !/2026/.test(post.title) && !/2025/.test(post.title)) {
    fixes.push({ field: 'title', issue: 'Missing year (freshness signal)', suggestion: 'Add "(2026 Guide)" or "(2026)" to title', severity: 'low' });
  }

  // Excerpt checks
  if (!post.excerpt) { fixes.push({ field: 'excerpt', issue: 'Missing excerpt', severity: 'high' }); }
  else if (post.excerpt.length < 120) { fixes.push({ field: 'excerpt', issue: `Too short (${post.excerpt.length} chars, min 120)`, severity: 'medium' }); }
  else if (post.excerpt.length > 165) { fixes.push({ field: 'excerpt', issue: `Too long (${post.excerpt.length} chars, max 165)`, severity: 'medium' }); }

  // Word count
  if (post.wordCount < 700) { fixes.push({ field: 'wordCount', issue: `Thin content (${post.wordCount} words, min 700)`, severity: 'high' }); }

  // FAQ check
  if (!post.hasFaq) { fixes.push({ field: 'body', issue: 'Missing FAQ section (GEO opportunity)', suggestion: 'Add 4-6 FAQ items with natural questions', severity: 'medium' }); }

  // H2 count
  if (post.h2s < 3) { fixes.push({ field: 'body', issue: `Only ${post.h2s} H2 sections, needs more structure`, severity: 'medium' }); }

  return fixes;
}

async function generateFAQ(post) {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const provider = process.env.GROQ_API_KEY ? 'groq' : 'openai';
  const prompt = `Generate 4 FAQ items for a blog post titled "${post.title}" about AI tools.
Each FAQ should be a real question people search on Google.
Return ONLY valid JSON array: [{"question": "...", "answer": "..."}]`;

  try {
    let result;
    if (provider === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [
          { role: 'system', content: 'Return ONLY valid JSON.' },
          { role: 'user', content: prompt },
        ], temperature: 0.5, max_tokens: 1000 }),
      });
      const data = await res.json();
      result = data.choices?.[0]?.message?.content?.trim();
    } else {
      const OpenAI = require('openai').default || require('openai');
      const client = new OpenAI({ apiKey });
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini', messages: [
          { role: 'system', content: 'Return ONLY valid JSON.' },
          { role: 'user', content: prompt },
        ], temperature: 0.5, max_tokens: 1000,
      });
      result = completion.choices[0].message.content.trim();
    }

    // Clean JSON
    result = result.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    const faqs = JSON.parse(result);
    if (!Array.isArray(faqs) || faqs.length === 0) return null;
    return faqs.slice(0, 6);
  } catch (err) {
    return null;
  }
}

// ---- Main ----
(async () => {
  const doFix = process.argv.includes('--fix');
  const doAiFix = process.argv.includes('--ai-fix');
  const dryRun = !doFix && !doAiFix;

  console.log(`🔍 SEO Optimizer${dryRun ? ' (dry run — use --fix to apply)' : ''}\n`);

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.mdx'));
  let totalFixes = 0;
  let totalApplied = 0;

  for (const file of files) {
    const post = getPostData(file);
    if (!post) { console.log(`⚠️  ${file}: could not parse`); continue; }

    const fixes = suggestFixes(post);
    if (fixes.length === 0) { console.log(`✅ ${post.slug}`); continue; }

    console.log(`\n📄 ${post.title}`);
    fixes.forEach((f) => {
      console.log(`  ${f.severity === 'high' ? '🔴' : f.severity === 'medium' ? '🟡' : '🟢'} [${f.severity}] ${f.issue}`);
      if (f.suggestion) console.log(`     → ${f.suggestion}`);
    });
    totalFixes += fixes.length;

    if (doFix || doAiFix) {
      const parsed = matter(post.content);
      const { data, content: body } = parsed;
      let changed = false;

      // Fix excerpt
      const excerptFix = fixes.find((f) => f.field === 'excerpt' && f.issue.startsWith('Too short'));
      if (excerptFix && post.excerpt) {
        data.excerpt = post.excerpt.replace(/([.!?])\s*.*$/, '$1 The definitive hands-on guide to help you decide.').slice(0, 160);
        changed = true;
      }

      // Fix missing year in title
      if (fixes.some((f) => f.issue.startsWith('Missing year')) && post.title) {
        const newTitle = post.title.replace(/\)\s*$/, ' (2026 Guide)').replace(/\([^)]*\)/, '(2026 Guide)');
        if (!newTitle.includes('2026')) {
          data.title = post.title + ' (2026 Guide)';
          changed = true;
        }
      }

      // Add FAQ via AI
      if (doAiFix && fixes.some((f) => f.issue === 'Missing FAQ section (GEO opportunity)')) {
        console.log(`  🤖 Generating FAQ for "${post.title}"...`);
        const faqs = await generateFAQ(post);
        if (faqs && faqs.length > 0) {
          const faqSection = '\n\n## FAQ\n\n' + faqs.map((f) =>
            `### ${f.question}\n${f.answer}`
          ).join('\n\n');
          // Insert before "Final Verdict" or at end
          if (body.includes('## Final Verdict')) {
            parsed.content = body.replace('## Final Verdict', faqSection + '\n\n## Final Verdict');
          } else {
            parsed.content = body.trimEnd() + faqSection;
          }
          changed = true;
          console.log(`  ✅ Added ${faqs.length} FAQ items`);
        } else {
          console.log(`  ⚠️ Could not generate FAQ`);
        }
      }

      if (changed) {
        const updated = matter.stringify(parsed.content, data);
        fs.writeFileSync(path.join(POSTS_DIR, file), updated, 'utf8');
        totalApplied++;
        console.log(`  ✅ Applied fixes to ${file}`);
      }
    }
  }

  console.log(`\n📊 ${totalFixes} issues found, ${totalApplied} fixed${dryRun ? ' (dry run)' : ''}`);
})().catch((err) => { console.error('\n❌ Fatal:', err.message); process.exit(1); });

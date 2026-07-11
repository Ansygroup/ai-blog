#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { groqGenerate, groqJson, hasGroqKey } = require('./ai-agent');

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const POSTS_PER_BATCH = 5;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const useAI = args.includes('--ai');
const targetSlug = args.find(a => a && !a.startsWith('--'));

function parseDate(content) {
  const match = content.match(/^date:\s*"?(\d{4}-\d{2}-\d{2})"?/m);
  return match ? new Date(match[1]) : null;
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function getBody(content) {
  const parts = content.split('---');
  return parts.slice(2).join('---').trim();
}

function getFrontmatter(content) {
  const get = (k) => (content.match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm')) || [])[1] || '';
  return { title: get('title'), excerpt: get('excerpt'), category: get('category'), tags: get('tags') };
}

async function aiRefreshPost(title, body, fm) {
  const prompt = `You are refreshing an old blog post to make it current. Update the content to feel fresh and up-to-date while keeping the original meaning and structure.

Title: "${title}"
Category: ${fm.category || 'uncategorized'}
Tags: ${fm.tags || 'none'}

Current body (first 3000 chars):
${body.slice(0, 3000)}

Instructions:
1. Update any time-sensitive references (e.g., "in 2025" → "in 2026")
2. Add a brief "What's New in 2026" section (1-2 paragraphs) if relevant
3. Keep the original post's voice and style
4. Do NOT rewrite the entire post — only update stale parts
5. Return ONLY the updated body content (everything after frontmatter), including all original sections with modifications

Important: Preserve all existing markdown formatting, links, and structure. Only update content that is actually stale or outdated.`;

  return groqGenerate(prompt, { temperature: 0.4, maxTokens: 4096 });
}

async function aiNewExcerpt(title, body) {
  const clean = body.replace(/<[^>]+>/g, '').replace(/[#*`>_~|]/g, '').replace(/\n+/g, ' ').trim().slice(0, 2000);
  const prompt = `Write a fresh SEO excerpt (120-160 characters) for this updated blog post.

Title: "${title}"
Content: ${clean}

Return only the excerpt text, 120-160 characters, no quotes.`;

  return groqGenerate(prompt, { temperature: 0.4, maxTokens: 200 });
}

(async () => {
  console.log('🔄 Content Refresher');
  console.log(`   ${dryRun ? 'DRY RUN — no changes will be saved' : 'LIVE mode'}\n`);

  if (!hasGroqKey()) {
    console.log('❌ GROQ_API_KEY is required for content-refresher. Set it in .env.local or environment.');
    process.exit(1);
  }

  if (!useAI) {
    console.log('⚠️ Content-refresher requires --ai flag (it uses Groq for all operations).');
    process.exit(1);
  }

  let files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));

  if (targetSlug) {
    const match = files.find(f => f.startsWith(targetSlug) || f === targetSlug + '.mdx');
    if (match) { files = [match]; }
    else { console.log(`❌ Post not found: ${targetSlug}`); process.exit(1); }
  } else {
    files.sort((a, b) => {
      const da = parseDate(fs.readFileSync(path.join(POSTS_DIR, a), 'utf8')) || new Date(0);
      const db = parseDate(fs.readFileSync(path.join(POSTS_DIR, b), 'utf8')) || new Date(0);
      return da - db;
    });
    files = files.slice(0, POSTS_PER_BATCH);
  }

  let refreshed = 0;
  let skipped = 0;

  for (const file of files) {
    const fp = path.join(POSTS_DIR, file);
    const raw = fs.readFileSync(fp, 'utf8');
    const parsed = matter(raw);
    const { data, content } = parsed;
    const body = getBody(raw);

    console.log(`\n📄 ${data.title || file}`);

    const oldDate = data.date ? new Date(data.date) : null;
    if (oldDate) {
      const monthsOld = (Date.now() - oldDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      console.log(`   Published: ${data.date} (${Math.round(monthsOld)} months old)`);
      if (monthsOld < 3) { console.log(`   ⏭ Less than 3 months old, skipping`); skipped++; continue; }
    }

    if (body.includes('## What\'s New in 2026') || body.includes('## What\'s New in 2027')) {
      console.log(`   ⏭ Already refreshed, skipping`);
      skipped++;
      continue;
    }

    const updatedBody = await aiRefreshPost(data.title || file, body, data);
    if (!updatedBody || wordCount(updatedBody) < wordCount(body) * 0.5) {
      console.log(`   ⏭ Refresh failed (AI returned insufficient content)`);
      skipped++;
      continue;
    }

    let updatedExcerpt = data.excerpt || '';
    const newExcerpt = await aiNewExcerpt(data.title || file, updatedBody);
    if (newExcerpt && newExcerpt.length >= 80) {
      updatedExcerpt = newExcerpt.trim().slice(0, 160).replace(/\s+\S*$/, '');
    }

    if (data.date) {
      const today = new Date().toISOString().split('T')[0];
      data.updated = today;
    }

    if (updatedExcerpt) data.excerpt = updatedExcerpt;

    const newContent = matter.stringify(updatedBody, data);

    if (dryRun) {
      const diff = wordCount(updatedBody) - wordCount(body);
      console.log(`   📝 Would update: ${file} (${diff > 0 ? '+' : ''}${diff} words)`);
      if (updatedExcerpt !== (data.excerpt || '')) console.log(`   📝 New excerpt: "${updatedExcerpt}"`);
    } else {
      fs.writeFileSync(fp, newContent, 'utf8');
      console.log(`   ✅ Refreshed: ${file}`);
    }
    refreshed++;
  }

  console.log(`\n📊 Done. Refreshed: ${refreshed} | Skipped: ${skipped} | Total: ${files.length}`);
  if (dryRun) console.log('💡 Run without --dry-run to apply changes');
})();

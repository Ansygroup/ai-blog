#!/usr/bin/env node
/**
 * One-off: expand posts under 500 words using Gemini (free tier).
 * Quality-first: each expansion is generated per-post, specific to the
 * topic, inserted before the final section. Rate-limited to stay under
 * Gemini free tier (15 req/min).
 *
 * Usage:
 *   node scripts/expand-thin-once.js --dry-run        # list targets only
 *   node scripts/expand-thin-once.js --limit 1        # test on one post
 *   node scripts/expand-thin-once.js                  # expand all
 */
const fs = require('fs');
const path = require('path');
const { generate, hasKey } = require('./ai-agent');

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const MIN_WORDS = 500;
const TARGET_WORDS = 700;
const SLEEP_MS = 4500; // 15 req/min free tier
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 0;

if (!dryRun && !hasKey()) {
  console.error('No AI API key set (GEMINI_API_KEY, OPENROUTER_API_KEY, or GROQ_API_KEY)');
  process.exit(1);
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function splitFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { fm: '', body: content };
  return { fm: '---\n' + match[1] + '\n---\n', body: match[2].trimStart() };
}

function getMeta(fm) {
  const get = (k) => (fm.match(new RegExp(`^${k}:\s*"?([^"\n]*)"?`, 'm')) || [])[1] || '';
  return { title: get('title'), category: get('category'), tags: get('tags') };
}

function insertBeforeLastSection(body, section) {
  const h2s = [...body.matchAll(/^## /gm)];
  if (h2s.length === 0) return body + section;
  const idx = h2s[h2s.length - 1].index;
  return body.slice(0, idx) + section + '\n' + body.slice(idx);
}

(async () => {
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
  const targets = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
    const { fm, body } = splitFrontmatter(content);
    const words = wordCount(body);
    if (words < MIN_WORDS) {
      targets.push({ file, words, meta: getMeta(fm) });
    }
  }

  targets.sort((a, b) => a.words - b.words);
  console.log(`Found ${targets.length} posts under ${MIN_WORDS} words`);

  if (dryRun) {
    targets.forEach((t) => console.log(`  ${t.words}  ${t.file}`));
    return;
  }

  const queue = limit ? targets.slice(0, limit) : targets;
  let done = 0;
  let failed = 0;

  for (const t of queue) {
    const filePath = path.join(POSTS_DIR, t.file);
    const content = fs.readFileSync(filePath, 'utf8');
    const { fm, body } = splitFrontmatter(content);
    const meta = getMeta(fm);

    try {
      const prompt = `You are expanding a short blog post about "${meta.title}" (category: ${meta.category}, tags: ${meta.tags}).

Current body:
${body.slice(0, 3000)}

Write 2 new markdown sections (300-450 words total) that add genuine value to this specific post:
- Use ## headings, specific to this exact topic — no generic filler
- Reference the actual tools/claims already in the post where relevant
- Match the post's existing tone and depth; no AI clichés ("in today's fast-paced world", "unlock", "game-changer")
- One section should be practical (steps, criteria, mistakes, or a concrete example), one can be forward-looking

Return ONLY the new markdown sections, no preamble, no code fences.`;

      const section = await generate(prompt, { temperature: 0.6, maxTokens: 2048 });
      if (!section || section.length < 200) throw new Error('empty/short response');

      const newBody = insertBeforeLastSection(body, '\n' + section.replace(/^#+\s*$/, '').trim() + '\n');
      fs.writeFileSync(filePath, fm + newBody);
      const newTotal = wordCount(fm + newBody);
      done++;
      console.log(`✅ ${t.file}: ${t.words} → ${newTotal} words`);
    } catch (e) {
      failed++;
      console.log(`❌ ${t.file}: ${e.message}`);
    }

    if (done + failed < queue.length) await new Promise((r) => setTimeout(r, SLEEP_MS));
  }

  console.log(`\nDone: ${done} expanded, ${failed} failed`);
})();
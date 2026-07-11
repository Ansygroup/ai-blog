#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { groqGenerate, hasGroqKey } = require('./ai-agent');

const dir = path.join(process.cwd(), 'content', 'posts');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mdx'));
const useAI = process.argv.includes('--ai');
let fixed = 0;

async function aiExcerpt(title, content) {
  const clean = content
    .replace(/<[^>]+>/g, '')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/[#*`>_~|]/g, '')
    .replace(/\n+/g, ' ').trim().slice(0, 2000);

  const prompt = `Write a compelling SEO excerpt (120-160 characters) for this blog post.

Title: "${title}"
Content: ${clean}

Rules:
- Must be 120-160 characters
- Be engaging and make people want to click
- Include the main keyword naturally
- No quotes around the excerpt
- Return ONLY the excerpt text, nothing else`;

  return groqGenerate(prompt, { temperature: 0.4, maxTokens: 300 });
}

(async () => {
  if (useAI && hasGroqKey()) {
    console.log(`🤖 AI mode — Groq-powered excerpts\n`);
    for (const file of files) {
      const fp = path.join(dir, file);
      const raw = fs.readFileSync(fp, 'utf8');
      const parsed = matter(raw);
      const { data, content } = parsed;

      const excerpt = data.excerpt || '';
      if (excerpt.length >= 120 && excerpt.length <= 160) continue;

      const ai = await aiExcerpt(data.title || file, content);
      if (!ai || ai.length < 50) continue;
      const newExcerpt = ai.trim().slice(0, 160).replace(/\s+\S*$/, '');

      data.excerpt = newExcerpt;
      const updated = matter.stringify(content, data);
      fs.writeFileSync(fp, updated, 'utf8');
      fixed++;
      console.log(`  Fixed: ${file} (${excerpt.length || 0} → ${newExcerpt.length} chars) [AI]`);
    }
  } else {
    if (useAI) console.log('⚠️ --ai flag used but no GROQ_API_KEY found. Falling back to rule-based.\n');
    for (const file of files) {
      const fp = path.join(dir, file);
      const raw = fs.readFileSync(fp, 'utf8');
      const parsed = matter(raw);
      const { data, content } = parsed;

      const excerpt = data.excerpt || '';
      if (excerpt.length >= 120 && excerpt.length <= 160) continue;

      const clean = content
        .replace(/<[^>]+>/g, '')
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        .replace(/\[([^\]]*)\]\([^)]+\)/g, '$1')
        .replace(/[#*`>_~|]/g, '')
        .replace(/\n+/g, ' ').trim();
      const newExcerpt = clean.slice(0, 155).replace(/\s+\S*$/, '') + '...';
      if (newExcerpt.length <= 10 || newExcerpt === excerpt) continue;

      data.excerpt = newExcerpt;
      const updated = matter.stringify(content, data);
      fs.writeFileSync(fp, updated, 'utf8');
      fixed++;
      console.log('  Fixed:', file, '(' + excerpt.length + ' -> ' + newExcerpt.length + ' chars)');
    }
  }

  console.log('\nFixed excerpts:', fixed);
})();

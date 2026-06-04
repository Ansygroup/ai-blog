#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const COMPARISONS_DIR = path.join(__dirname, '..', 'content', 'posts');
const COMPARISON_PAIRS = [
  ['ChatGPT', 'Claude', 'AI Chatbots'],
  ['Jasper AI', 'Copy.ai', 'AI Writing'],
  ['Midjourney', 'DALL-E 3', 'AI Image Generation'],
  ['Runway', 'Pika', 'AI Video'],
  ['Descript', 'Riverside', 'AI Podcast'],
  ['Notion AI', 'Mem', 'AI Notes'],
  ['Perplexity', 'Gemini', 'AI Search'],
];

if (!fs.existsSync(COMPARISONS_DIR)) fs.mkdirSync(COMPARISONS_DIR, { recursive: true });

const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) { console.log('No GROQ_API_KEY — skipping generation'); process.exit(0); }

async function callGroq(prompt) {
  const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
  for (const model of models) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 3000 }),
      });
      if (res.ok) return (await res.json()).choices?.[0]?.message?.content?.trim() || '';
      const err = await res.text();
      if (res.status === 429) { await new Promise(r => setTimeout(r, 5000)); continue; }
      console.log(`  ${model} failed: ${err.slice(0, 80)}`);
    } catch { await new Promise(r => setTimeout(r, 5000)); }
  }
  return null;
}

function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60); }

(async () => {
  let generated = 0;
  for (const [a, b, cat] of COMPARISON_PAIRS) {
    const slug = slugify(`${a}-vs-${b}`);
    const filePath = path.join(COMPARISONS_DIR, `${slug}.mdx`);
    if (fs.existsSync(filePath)) { console.log(`  Skipping ${slug} (exists)`); continue; }
    console.log(`Generating: ${a} vs ${b}...`);
    const content = await callGroq(`Write a detailed comparison article: "${a} vs ${b} 2026 — Which Is Better?".
Include: intro, feature comparison table, pricing, pros/cons for each, use cases, FAQ, final verdict.
Format: YAML frontmatter with title, excerpt, date, category: "${cat}", tags as a JSON array like ["tag1", "tag2"]. Then markdown body.
Target: 1500-2000 words. Return ONLY the markdown with frontmatter.`);
    if (!content) { console.log(`  Failed to generate ${slug}`); continue; }
    const cleaned = content.replace(/^```markdown\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');
    fs.writeFileSync(filePath, cleaned, 'utf8');
    generated++;
    console.log(`  ✅ ${slug}`);
    await new Promise(r => setTimeout(r, 3000));
  }
  console.log(`\nDone. Generated ${generated} comparison pages.`);
  if (generated > 0) {
    console.log('Next: commit and push to deploy.');
  }
})();

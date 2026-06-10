#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');

const HUMANIZER_PROMPT = `You are a writing editor that removes signs of AI-generated text to make writing sound natural and human.

## Key principles:
1. Remove inflated significance — no "marking a pivotal moment" or "in today's rapidly evolving landscape"
2. Cut promotional language — no "nestled in the breathtaking region" or "must-visit"
3. Fix superficial -ing analyses — no "symbolizing... reflecting... showcasing..."
4. Replace vague attributions with specific sources
5. Remove AI vocabulary: testament, landscape, pivotal, underscore, delve, foster, showcase, vibrant
6. Replace "serves as / stands as / features / boasts" with "is / has"
7. Remove "It's not just X, it's Y" constructions
8. Break up rule-of-three patterns
9. Remove em dashes (replace with periods, commas, or colons)
10. Remove boldface overuse, inline-header lists, emojis, title case in headings
11. Remove chatbot artifacts ("I hope this helps", "Let me know if...")
12. Cut filler phrases ("in order to" -> "to", "due to the fact that" -> "because")
13. Remove excessive hedging ("could potentially possibly" -> "may")
14. Remove generic positive conclusions
15. Cut signposting ("Let's dive in", "Here's what you need to know")

## Output rules:
- Rewrite the full post in valid MDX preserving frontmatter exactly
- Keep the same structure (paragraphs, headings, lists)
- Preserve all internal links, external links, and image references
- Make it sound like a human wrote it — varied sentence length, natural transitions
- Do NOT add new AI-sounding content or fabricate facts
- Return ONLY the complete file content (frontmatter + body)`;

async function humanizePost(slug) {
  const filePath = path.join(POSTS_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) {
    console.error(`Post not found: ${slug}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]+)$/);
  if (!match) {
    console.error(`Invalid MDX format: ${slug}`);
    process.exit(1);
  }

  const frontmatter = match[1];
  const body = match[2];

  console.log(`Humanizing: ${slug} (${body.split(/\s+/).length} words)...`);

  const systemPrompt = HUMANIZER_PROMPT;
  const userPrompt = `Humanize the following blog post. Make it sound natural and human-written while preserving all facts, links, and the MDX frontmatter exactly as-is.\n\n\`\`\`mdx\n${content}\n\`\`\``;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('GROQ_API_KEY missing');
    process.exit(1);
  }

  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 8000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const rewritten = data.choices?.[0]?.message?.content?.trim();
  if (!rewritten) {
    throw new Error('Empty response from Groq');
  }

  const rewrittenMatch = rewritten.match(/^---\r?\n[\s\S]+?\r?\n---\r?\n[\s\S]+$/);
  const finalContent = rewrittenMatch ? rewritten : `---\n${frontmatter}\n---\n\n${rewritten}`;

  fs.writeFileSync(filePath, finalContent, 'utf8');
  console.log(`Done: ${slug}`);
}

async function main() {
  const args = process.argv.slice(2);
  const slugIndex = args.findIndex(a => !a.startsWith('--'));

  if (slugIndex === -1) {
    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
    console.log(`Humanizing all ${files.length} posts...`);
    for (const file of files) {
      const slug = file.replace(/\.mdx$/, '');
      await humanizePost(slug);
    }
  } else {
    const slug = args[slugIndex].replace(/\.mdx$/, '');
    await humanizePost(slug);
  }
}

main().catch(err => { console.error(err); process.exit(1); });

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { generate, hasKey } = require('./ai-agent');
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

  if (!hasKey()) {
    console.warn('⚠️  No AI API key found — skipping humanize (post left as-is).');
    return;
  }

  const result = await generate(`${systemPrompt}\n\n${userPrompt}`, { temperature: 0.5, maxTokens: 8000 });
  
  if (!result || result.trim().length < 100) {
    console.warn('⚠️  Humanizer returned empty/short result — post left as-is.');
    return;
  }

  fs.writeFileSync(filePath, result.trim());
  console.log(`✅ ${slug} humanized`);
}

const args = process.argv.slice(2);
const slug = args.find(a => !a.startsWith('--'));

if (slug) {
  humanizePost(slug);
} else {
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
  for (const file of files) {
    await humanizePost(file.replace(/\.mdx$/, ''));
  }
  console.log('\n✅ All posts processed');
}
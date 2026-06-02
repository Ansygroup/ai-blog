#!/usr/bin/env node
/**
 * scripts/expand-queue.js
 *
 * Appends a starter pack of high-intent AI niche topics to keyword-queue.json
 * so auto-publishing has 60+ topics to drain before going dry.
 *
 * Idempotent: re-running won't add duplicates (matches by topic string).
 *
 * Usage:   node scripts/expand-queue.js
 *          node scripts/expand-queue.js --count 100  (cap at 100 topics)
 */
const fs = require('fs');
const path = require('path');

const QUEUE_PATH = path.join(__dirname, 'keyword-queue.json');
const args = process.argv.slice(2);
const cap = parseInt(args[args.indexOf('--count') + 1] || '100', 10);

// 60 high-intent topics across the 4 categories. Mix of head terms and long tail.
const NEW_TOPICS = [
  // Reviews
  { topic: 'writesonic review 2026', category: 'Reviews', keywords: ['writesonic', 'ai writer'] },
  { topic: 'rytr review 2026', category: 'Reviews', keywords: ['rytr', 'budget ai writer'] },
  { topic: 'notion ai review 2026', category: 'Reviews', keywords: ['notion ai', 'productivity'] },
  { topic: 'grammarly go review 2026', category: 'Reviews', keywords: ['grammarly', 'ai writing assistant'] },
  { topic: 'anyword review 2026', category: 'Reviews', keywords: ['anyword', 'ai copywriting'] },
  { topic: 'ink editor review 2026', category: 'Reviews', keywords: ['ink editor', 'seo writing'] },
  { topic: 'hypotenuse ai review 2026', category: 'Reviews', keywords: ['hypotenuse', 'ecommerce ai'] },
  { topic: 'frase review 2026', category: 'Reviews', keywords: ['frase', 'seo content'] },

  // Best Of
  { topic: 'best ai tools for ecommerce 2026', category: 'Best Of', keywords: ['ai ecommerce', 'product description ai'] },
  { topic: 'best ai tools for designers 2026', category: 'Best Of', keywords: ['ai design', 'figma ai'] },
  { topic: 'best ai code assistants 2026', category: 'Best Of', keywords: ['copilot', 'cursor', 'codeium'] },
  { topic: 'best ai voice generators 2026', category: 'Best Of', keywords: ['ai voice', 'elevenlabs'] },
  { topic: 'best ai music generators 2026', category: 'Best Of', keywords: ['suno', 'udio', 'ai music'] },
  { topic: 'best ai tools for sales 2026', category: 'Best Of', keywords: ['ai sales', 'leadgen ai'] },
  { topic: 'best ai tools for hr 2026', category: 'Best Of', keywords: ['ai recruiting', 'hr automation'] },
  { topic: 'best ai presentation tools 2026', category: 'Best Of', keywords: ['gamma', 'tome', 'ai slides'] },
  { topic: 'best ai research tools 2026', category: 'Best Of', keywords: ['ai research', 'perplexity'] },
  { topic: 'best ai tools for translation 2026', category: 'Best Of', keywords: ['ai translation', 'deepl'] },
  { topic: 'best ai tools for data analysis 2026', category: 'Best Of', keywords: ['ai data', 'data analyst'] },
  { topic: 'best ai tools for social media managers 2026', category: 'Best Of', keywords: ['social media ai', 'content scheduling'] },

  // Comparisons
  { topic: 'midjourney vs dall-e 3 vs stable diffusion 2026', category: 'Comparisons', keywords: ['midjourney', 'dall-e', 'stable diffusion'] },
  { topic: 'elevenlabs vs play ht vs murf 2026', category: 'Comparisons', keywords: ['ai voice', 'elevenlabs'] },
  { topic: 'suno vs udio 2026', category: 'Comparisons', keywords: ['ai music', 'suno', 'udio'] },
  { topic: 'perplexity vs google search 2026', category: 'Comparisons', keywords: ['perplexity', 'ai search'] },
  { topic: 'cursor vs github copilot vs codeium 2026', category: 'Comparisons', keywords: ['cursor', 'copilot', 'codeium'] },
  { topic: 'gamma vs tome vs beautiful ai 2026', category: 'Comparisons', keywords: ['ai presentations'] },
  { topic: 'jasper vs writesonic vs copy ai 2026', category: 'Comparisons', keywords: ['jasper', 'writesonic', 'copy ai'] },
  { topic: 'claude 4 vs gpt-4o vs gemini 1.5 2026', category: 'Comparisons', keywords: ['claude 4', 'gpt-4o', 'gemini'] },
  { topic: 'notion ai vs clickup ai 2026', category: 'Comparisons', keywords: ['notion ai', 'clickup ai'] },
  { topic: 'frase vs surfer seo vs clearscope 2026', category: 'Comparisons', keywords: ['frase', 'surfer seo', 'clearscope'] },

  // Tutorials
  { topic: 'how to use midjourney 2026', category: 'Tutorials', keywords: ['midjourney', 'image generation'] },
  { topic: 'how to write better chatgpt prompts 2026', category: 'Tutorials', keywords: ['prompt engineering', 'chatgpt prompts'] },
  { topic: 'how to use claude for coding 2026', category: 'Tutorials', keywords: ['claude code', 'ai coding'] },
  { topic: 'how to build a gpt wrapper 2026', category: 'Tutorials', keywords: ['gpt wrapper', 'ai product'] },
  { topic: 'how to fine tune an llm 2026', category: 'Tutorials', keywords: ['fine tuning', 'llm'] },
  { topic: 'how to use ai for email marketing 2026', category: 'Tutorials', keywords: ['ai email', 'email automation'] },
  { topic: 'how to use ai for keyword research 2026', category: 'Tutorials', keywords: ['keyword research', 'ai seo'] },
  { topic: 'how to build a rag system 2026', category: 'Tutorials', keywords: ['rag', 'vector database'] },
  { topic: 'how to use ai for customer support 2026', category: 'Tutorials', keywords: ['ai support', 'chatbot'] },
  { topic: 'how to monetize a newsletter with ai 2026', category: 'Tutorials', keywords: ['newsletter', 'ai monetization'] },
  { topic: 'how to write youtube scripts with ai 2026', category: 'Tutorials', keywords: ['youtube ai', 'ai scripts'] },
  { topic: 'how to use ai for podcast production 2026', category: 'Tutorials', keywords: ['ai podcast', 'podcast tools'] },
  { topic: 'how to build an ai saas in a weekend 2026', category: 'Tutorials', keywords: ['ai saas', 'indie hacker'] },
  { topic: 'how to use ai for product photography 2026', category: 'Tutorials', keywords: ['ai photography', 'product images'] },
  { topic: 'how to use ai for resume writing 2026', category: 'Tutorials', keywords: ['ai resume', 'job search'] },
  { topic: 'how to use ai for cover letters 2026', category: 'Tutorials', keywords: ['ai cover letter'] },
  { topic: 'how to use ai for cold email outreach 2026', category: 'Tutorials', keywords: ['cold email', 'ai outreach'] },
  { topic: 'how to use ai to summarize long documents 2026', category: 'Tutorials', keywords: ['ai summary', 'document ai'] },
  { topic: 'how to use ai for meeting notes 2026', category: 'Tutorials', keywords: ['ai meeting', 'fireflies'] },
  { topic: 'how to use ai to learn faster 2026', category: 'Tutorials', keywords: ['ai learning', 'study tools'] },
  { topic: 'how to use ai for social media content 2026', category: 'Tutorials', keywords: ['ai social media'] },
  { topic: 'how to use ai for copywriting 2026', category: 'Tutorials', keywords: ['ai copywriting'] },

  // AI News / Trends
  { topic: 'gpt-5 release date and features 2026', category: 'AI News', keywords: ['gpt-5', 'openai news'] },
  { topic: 'claude 4 opus vs sonnet comparison 2026', category: 'AI News', keywords: ['claude 4', 'anthropic'] },
  { topic: 'gemini 2.0 features 2026', category: 'AI News', keywords: ['gemini 2.0', 'google ai'] },
  { topic: 'openai operator agent 2026', category: 'AI News', keywords: ['operator', 'ai agents'] },
  { topic: 'ai regulation 2026 eu ai act', category: 'AI News', keywords: ['ai regulation', 'eu ai act'] },
];

const existing = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
const existingTopics = new Set(existing.map((t) => t.topic.toLowerCase()));

let added = 0;
let skipped = 0;
for (const t of NEW_TOPICS) {
  if (existingTopics.has(t.topic.toLowerCase())) { skipped++; continue; }
  if (existing.length + added >= cap) break;
  existing.push(t);
  added++;
}

fs.writeFileSync(QUEUE_PATH, JSON.stringify(existing, null, 2) + '\n', 'utf8');
console.log(`✅ Added ${added} new topics, skipped ${skipped} duplicates. Queue now has ${existing.length} topics.`);

const byCat = existing.reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + 1; return acc; }, {});
console.log('By category:');
Object.entries(byCat).forEach(([c, n]) => console.log(`  ${c}: ${n}`));

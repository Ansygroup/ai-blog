#!/usr/bin/env node
/**
 * scripts/generate-post.js
 *
 * Generates a new SEO + GEO-optimized blog post and writes it
 * to /content/posts/<slug>.mdx. The "24/7" content engine.
 *
 * ================================================================
 * SUPPORTED PROVIDERS (set AI_PROVIDER in .env.local):
 * ================================================================
 *
 *   groq           — FREE, fastest. Llama 3.3 70B (latest stable).
 *                    Sign up: https://console.groq.com/  (no card)
 *                    Get key: https://console.groq.com/keys
 *                    Model:   llama-3.3-70b-versatile  (recommended, default)
 *                             meta-llama/llama-4-scout-17b-16e-instruct  (newest)
 *                             llama-3.1-8b-instant     (faster, weaker)
 *                             qwen/qwen3-32b           (strong, large)
 *                             openai/gpt-oss-120b      (OpenAI open-source 120B)
 *                    Limits:  30 req/min, ~14,400 req/day (free tier)
 *
 *   openrouter     — FREE tier with many models, single API.
 *                    Sign up: https://openrouter.ai/  (no card)
 *                    Get key: https://openrouter.ai/keys
 *                    Model:   meta-llama/llama-3.1-8b-instruct:free
 *                             qwen/qwen-2-7b-instruct:free
 *                             mistralai/mistral-7b-instruct:free
 *                    Limits:  20 req/min, 200/day (free tier)
 *
 *   gemini         — FREE tier via Google AI Studio.
 *                    Sign up: https://aistudio.google.com/app/apikey
 *                    Model:   gemini-1.5-flash   (1M context, 15 req/min)
 *                             gemini-1.5-pro     (2M context, 2 req/min)
 *                    Limits:  15 req/min, 1500/day
 *
 *   openai         — PAID. Set OPENAI_API_KEY and AI_PROVIDER=openai
 *                    to use gpt-4o-mini (cheap) or gpt-4o (best).
 *
 *   ollama         — LOCAL. Run `ollama serve` with a model pulled.
 *                    No API key needed, but you need a GPU.
 *
 * ================================================================
 * USAGE:
 *   node scripts/generate-post.js "best ai writing tools 2026"
 *   node scripts/generate-post.js --from-keywords   (drain queue)
 *   node scripts/generate-post.js --batch 5         (5 posts in a row)
 *   AI_PROVIDER=groq node scripts/generate-post.js "topic"
 *
 * After generation:
 *   1. Review the post
 *   2. Add cover image (use Unsplash or generate)
 *   3. git add content/posts/<slug>.mdx
 *   4. git commit -m "post: <title>"
 *   5. git push   (auto-deploys to Vercel + pings IndexNow)
 */
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const KEYWORD_QUEUE = path.join(__dirname, 'keyword-queue.json');

if (!fs.existsSync(POSTS_DIR)) fs.mkdirSync(POSTS_DIR, { recursive: true });

// ================================================================
// Provider adapters — all return { generateText(prompt): Promise<string> }
// ================================================================

async function makeGroqProvider() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY missing. Sign up free at https://console.groq.com/');
  // Fallback chain: 70B (best) -> Llama 4 (newer, smaller MoE) -> 8B instant (always works)
  const primary = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const fallbacks = ['meta-llama/llama-4-scout-17b-16e-instruct', 'llama-3.1-8b-instant', 'qwen/qwen3-32b'];
  const models = [primary, ...fallbacks.filter((m) => m !== primary)];

  return {
    name: `groq/${primary}`,
    async generateText(prompt, systemPrompt) {
      let lastErr;
      for (const model of models) {
        let retries = 0;
        while (retries <= 1) {
          try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
              body: JSON.stringify({
                model,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: prompt },
                ],
                temperature: 0.7,
                max_tokens: 4500,
              }),
            });
            if (res.ok) {
              const data = await res.json();
              return data.choices?.[0]?.message?.content?.trim() || '';
            }
            const errText = await res.text();
            // 429 = rate limit — retry once, then switch model
            if (res.status === 429) {
              retries++;
              if (retries <= 1) {
                console.log(`   ⏳ ${model}: 429 — retrying in 8s...`);
                await new Promise((r) => setTimeout(r, 8000));
                lastErr = new Error(`Groq ${res.status}: ${errText.slice(0, 120)}`);
                continue;
              }
              console.log(`   ⏳ ${model}: 429 again — switching to next model`);
              lastErr = new Error(`Groq ${res.status}: ${errText.slice(0, 120)}`);
              await new Promise((r) => setTimeout(r, 3000));
              break;
            }
            // 413 = too long — try next model
            if (res.status === 413) {
              console.log(`   ⏳ ${model}: ${res.status} — too long, switching to next model`);
              lastErr = new Error(`Groq ${res.status}: ${errText.slice(0, 120)}`);
              await new Promise((r) => setTimeout(r, 5000));
              break;
            }
            // 400 with "decommissioned" or other model errors → try next
            if (res.status === 400 && /decommissioned|not supported|not found|invalid model/i.test(errText)) {
              console.log(`   ⏳ ${model}: 400 (model gone) — switching to next`);
              lastErr = new Error(`Groq ${res.status}: ${errText.slice(0, 120)}`);
              break;
            }
            // Hard error — don't retry
            throw new Error(`Groq ${res.status}: ${errText.slice(0, 200)}`);
          } catch (err) {
            if (err.message.startsWith('Groq ')) throw err;
            lastErr = err;
            console.log(`   ⏳ ${model}: network error — switching to next`);
            break;
          }
        }
      }
      throw lastErr || new Error('All Groq models failed');
    },
  };
}

async function makeOpenRouterProvider() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY missing. Sign up free at https://openrouter.ai/');
  const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free';
  return {
    name: `openrouter/${model}`,
    async generateText(prompt, systemPrompt) {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://ai-blog-ten-steel.vercel.app',
          'X-Title': 'AI Pulse Daily',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 4500,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenRouter ${res.status}: ${err.slice(0, 200)}`);
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || '';
    },
  };
}

async function makeGeminiProvider() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY missing. Get a free key at https://aistudio.google.com/app/apikey');
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  return {
    name: `gemini/${model}`,
    async generateText(prompt, systemPrompt) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4500 },
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini ${res.status}: ${err.slice(0, 200)}`);
      }
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    },
  };
}

async function makeOllamaProvider() {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3.1';
  return {
    name: `ollama/${model}`,
    async generateText(prompt, systemPrompt) {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          stream: false,
          options: { temperature: 0.7, num_predict: 4500 },
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Ollama ${res.status}: ${err.slice(0, 200)}`);
      }
      const data = await res.json();
      return data.message?.content?.trim() || '';
    },
  };
}

async function makeOpenAIProvider() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY missing.');
  const OpenAI = require('openai').default || require('openai');
  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  return {
    name: `openai/${model}`,
    async generateText(prompt, systemPrompt) {
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4500,
      });
      return completion.choices[0].message.content.trim();
    },
  };
}

const PROVIDERS = {
  groq: makeGroqProvider,
  openrouter: makeOpenRouterProvider,
  gemini: makeGeminiProvider,
  ollama: makeOllamaProvider,
  openai: makeOpenAIProvider,
};

async function getProvider() {
  const requested = (process.env.AI_PROVIDER || 'groq').toLowerCase();
  // Auto-detect if user only set one of the keys
  let provider = requested;
  if (requested === 'groq' && !process.env.GROQ_API_KEY) {
    if (process.env.OPENROUTER_API_KEY) { provider = 'openrouter'; console.log(`   ⚡ GROQ_API_KEY not set — falling back to openrouter`); }
    else if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) { provider = 'gemini'; console.log(`   ⚡ GROQ_API_KEY not set — falling back to gemini`); }
    else if (process.env.OPENAI_API_KEY) { provider = 'openai'; console.log(`   ⚡ GROQ_API_KEY not set — falling back to openai`); }
  }
  const factory = PROVIDERS[provider];
  if (!factory) {
    throw new Error(`Unknown AI_PROVIDER "${provider}". Valid: ${Object.keys(PROVIDERS).join(', ')}`);
  }
  const p = await factory();
  console.log(`🤖 Using provider: ${p.name}\n`);
  return p;
}

// ================================================================
// CLI args + topic queue
// ================================================================

const args = process.argv.slice(2);
const topicArg = args.find((a) => !a.startsWith('--'));
const fromQueue = args.includes('--from-keywords');
const batchSize = parseInt(args[args.indexOf('--batch') + 1] || '1', 10);

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

function getTopics() {
  const queue = JSON.parse(fs.readFileSync(KEYWORD_QUEUE, 'utf8'));
  if (fromQueue) {
    return queue.slice(0, batchSize);
  }
  // Check if topic is in queue for correct category
  const match = queue.find((t) => t.topic.toLowerCase() === topicArg.toLowerCase());
  if (match) return [match];
  return [{ topic: topicArg, keywords: [topicArg], category: 'AI Tools' }];
}

// ================================================================
// Prompts (identical regardless of provider)
// ================================================================

const SYSTEM_PROMPT = `You are a senior SEO content writer for an independent AI tools review site.
You write long-form, deeply researched, E-E-A-T-compliant articles optimized for BOTH Google search (SEO) AND AI search engines like Perplexity, ChatGPT, and Google AI Overviews (GEO = Generative Engine Optimization).

CRITICAL RULES:
1. QUALITY: Minimum 1500 words not counting frontmatter. Minimum 5 H2 headings. Include a FAQ section with 4-6 questions.
2. GEO SECTIONS (REQUIRED): Every post MUST have <div class="key-takeaways"> and <div class="quick-answer"> IMMEDIATELY after the H1, never at the end or after the divider.
3. AMAZON LINKS: When relevant to the topic, naturally mention products available on Amazon and link them with Amazon URLs using the format https://www.amazon.com/dp/XXXX?tag=ansy07-20. For example, if writing about AI tools, mention laptops or monitors that readers might need.
4. COVER IMAGE: Use a real Unsplash photo URL: https://images.unsplash.com/photo-XXXXX?w=1200. Pick a relevant photo ID.
5. NEVER repeat "Key Takeaways" or "Quick Answer" headings anywhere in the article except in the GEO sections after the H1. Include them exactly once.

Your output must be valid Markdown with YAML frontmatter. Use this exact structure:

---
title: "<SEO title 50-60 chars>"
slug: "<auto>"
excerpt: "<150-160 char meta description including primary keyword>"
description: "<same as excerpt>"
date: "<YYYY-MM-DD>"
lastUpdated: "<YYYY-MM-DD>"
author: "Editorial Team"
category: "<Reviews|Comparisons|Tutorials|Best Of|AI News>"
tags: ["tag1", "tag2", "tag3", "tag4", "tag5"]
cover: "https://images.unsplash.com/photo-XXXXX?w=1200"
draft: false
---

# <H1 — include primary keyword>

<2-3 sentence hook. Primary keyword in first sentence. Keep it punchy.>

<div class="key-takeaways">

## Key Takeaways

- 3-5 bullet summary points with specific numbers and data

</div>

<div class="quick-answer">

## Quick Answer

<2-3 sentence direct answer. Start with a clear recommendation, not background.>

</div>

## What Is <Primary Keyword>?

<Define topic. 2-3 paragraphs with specific examples. Use primary keyword 2-3 times.>

## How We Tested

<1 paragraph methodology — E-E-A-T trust signal. Include time spent, number of tools tested, criteria.>

<5-8 main H2 sections, 250-400 words each. NEVER repeat same H2 heading twice. Each section must have specific tool names, prices, and data. Include 1-2 Amazon affiliate links naturally within the content where relevant (e.g., "paired with a [Dell UltraSharp 4K monitor](https://www.amazon.com/dp/B09N3ZN2YY?tag=ansy07-20)").>

## Pros and Cons

| Pros | Cons |
|------|------|
| <specific point> | <specific point> |
| <specific point> | <specific point> |

## Pricing Overview

<Structured pricing — AI engines love comparison tables.>

## Who Should Use This?

<2-3 specific user personas with tool recommendations.>

## Who Should Skip This?

<Honest counter-recommendation with alternative suggestions.>

## FAQ

### <Real question people search>
<2-3 sentence answer with specific details>

### <Real question people search>
<2-3 sentence answer with specific details>

### <Real question people search>
<2-3 sentence answer with specific details>

### <Real question people search>
<2-3 sentence answer with specific details>

(minimum 4 questions, 6 max)

## Final Verdict

<3-4 sentence verdict. Bold the final recommendation. Include a comparison to a runner-up.>

---

**About the author:** Editorial Team tests AI tools hands-on. Prices and ratings are accurate as of publication date. [Disclosure: This post contains affiliate links. As an Amazon Associate we earn from qualifying purchases.]`;

async function generatePost(provider, topicObj) {
  const topic = topicObj.topic;
  const keywords = (topicObj.keywords || [topic]).join(', ');
  const category = topicObj.category || 'AI Tools';

  console.log(`📝 Generating: "${topic}"`);

  const userPrompt = `Write a complete, publication-ready blog post for the topic: "${topic}".
Primary keyword: "${topic}"
Related keywords: ${keywords}
Category: ${category}
Target length: 2,500-3,000 words
Tone: expert, friendly, slightly opinionated. Use specific numbers, examples, and real tool names.
Include a real comparison table where relevant.
Intro must be under 80 words.
Every H2 must be unique — NEVER repeat the same H2 heading twice.
FAQ: 4-6 real questions people ask on Google.
Cite at least 2 real competitors.
CRITICAL: Return ONLY the markdown with frontmatter — no preamble or commentary. Start directly with "---" and end with markdown.`;

  const content = await provider.generateText(userPrompt, SYSTEM_PROMPT);

  // Strip code fences if model wrapped it
  let cleaned = content.replace(/^```markdown\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  // Fix date and lastUpdated to actual today (use m flag for multiline)
  const todayStr = new Date().toISOString().split('T')[0];
  cleaned = cleaned.replace(/^date:\s*["']?[^"'\n]+["']?/m, `date: "${todayStr}"`);
  cleaned = cleaned.replace(/^lastUpdated:\s*["']?[^"'\n]+["']?/m, `lastUpdated: "${todayStr}"`);

  // Derive slug from frontmatter or topic. Validate to prevent bad slugs like "excerpt:..."
  let slug = slugify(topic);
  const slugMatch = cleaned.match(/^slug:\s*["']?([^"'\n]+)["']?/m);
  if (slugMatch) {
    const candidate = slugMatch[1].trim().toLowerCase();
    // Only use the regex match if it looks like a valid slug (no YAML key names, no colons)
    if (!/^(title|excerpt|description|date|author|category|tags|cover|draft|slug)[:\s]/.test(candidate) && !candidate.includes(':') && candidate.length > 5) {
      slug = candidate;
    }
  }

  // Quality check
  // Dedup GEO sections: remove Key Takeaways + Quick Answer if they appear after FAQ
  const faqIdx = cleaned.lastIndexOf('\n## FAQ');
  if (faqIdx > 0) {
    const beforeFaq = cleaned.slice(0, faqIdx);
    const afterFaq = cleaned.slice(faqIdx);
    const hasGeoNearTop = beforeFaq.includes('class="key-takeaways"') && beforeFaq.includes('class="quick-answer"');
    if (hasGeoNearTop) {
      // Strip trailing GEO sections before FAQ
      cleaned = beforeFaq.replace(/\n## Quick Answer[\s\S]*?(?=\n##|$)/, '')
        .replace(/\n<div class="key-takeaways">[\s\S]*?(?=\n</div>)/, '')
        .replace(/\n<div class="key-takeaways">[\s\S]*?\n<\/div>/, '')
        + afterFaq;
    }
  }

  const body = cleaned.match(/^---\n[\s\S]+?\n---\n([\s\S]+)$/)?.[1] || cleaned;
  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const h2Count = (body.match(/^## /gm) || []).length;
  const hasFaq = body.includes('## FAQ');
  const hasGEO = body.includes('class="key-takeaways"') && body.includes('class="quick-answer"');
  const warnings = [];
  if (wordCount < 800) warnings.push(`thin content (${wordCount} words)`);
  if (h2Count < 3) warnings.push(`only ${h2Count} H2 headings`);
  if (!hasFaq) warnings.push('missing FAQ');
  if (!hasGEO) warnings.push('missing GEO sections');
  if (warnings.length > 0) console.log(`   ⚠  ${warnings.join(', ')}`);

  const filePath = path.join(POSTS_DIR, `${slug}.mdx`);
  fs.writeFileSync(filePath, cleaned, 'utf8');
  console.log(`✅ Wrote ${filePath} (${(cleaned.length / 1024).toFixed(1)} KB, ${wordCount} words, ${h2Count} H2)`);

  // Remove from queue if it was there
  if (fromQueue) {
    const queue = JSON.parse(fs.readFileSync(KEYWORD_QUEUE, 'utf8'));
    const filtered = queue.filter((k) => k.topic !== topic);
    fs.writeFileSync(KEYWORD_QUEUE, JSON.stringify(filtered, null, 2));
  }
  return filePath;
}

// ================================================================
// Main
// ================================================================

(async () => {
  if (!topicArg && !fromQueue) {
    console.error('Usage:');
    console.error('  node scripts/generate-post.js "topic here"');
    console.error('  node scripts/generate-post.js --from-keywords');
    console.error('  node scripts/generate-post.js --from-keywords --batch 5');
    console.error('');
    console.error('Set AI_PROVIDER=groq|openrouter|gemini|ollama|openai in .env.local');
    process.exit(1);
  }

  const provider = await getProvider();
  const topics = getTopics();
  let ok = 0, fail = 0;
  for (let i = 0; i < topics.length; i++) {
    const t = topics[i];
    try {
      await generatePost(provider, t);
      ok++;
    } catch (err) {
      console.error(`❌ Failed: ${t.topic}\n   ${err.message}`);
      fail++;
    }
    // Adaptive backoff: longer sleep between posts so we don't trip rate limits
    if (i < topics.length - 1) {
      const sleepSec = fail > 0 ? 15 : 8;
      process.stdout.write(`   ⏱  waiting ${sleepSec}s before next post...\n`);
      await new Promise((r) => setTimeout(r, sleepSec * 1000));
    }
  }
  console.log(`\n🎉 Done. ${ok} generated, ${fail} failed.`);
  console.log('Next: review files in content/posts/, add cover images, then git push to deploy.');
})().catch((err) => {
  console.error('\n💥 Fatal:', err.message);
  console.error('\nQuick fix:');
  console.error('  1. Sign up free at https://console.groq.com/');
  console.error('  2. Get a key at https://console.groq.com/keys');
  console.error('  3. Add to .env.local:  GROQ_API_KEY=***   AI_PROVIDER=groq');
  console.error('  4. Run:  node scripts/generate-post.js --from-keywords');
  process.exit(1);
});

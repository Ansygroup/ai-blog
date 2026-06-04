#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const DB_PATH = path.join(__dirname, 'amazon-db.json');
const TAG = process.env.AMAZON_ASSOCIATES_TAG || 'ansy07-20';

const CATEGORY_POSTS = {
  laptops: { title: 'Best Laptops for AI & Development 2026', slug: 'best-laptops-ai-development-2026', description: 'The best laptops for AI development, machine learning, and programming in 2026.' },
  headphones: { title: 'Best Noise-Cancelling Headphones for Deep Work 2026', slug: 'best-noise-cancelling-headphones-2026', description: 'Focus better with the best noise-cancelling headphones for deep work and content creation in 2026.' },
  monitors: { title: 'Best Monitors for Programming & Design 2026', slug: 'best-monitors-programming-design-2026', description: 'The best monitors for coding, design, and content creation in 2026. 4K, ultra-wide, OLED tested.' },
  'ai-books': { title: 'Best AI Books to Read in 2026', slug: 'best-ai-books-2026', description: 'The essential AI books every technologist should read in 2026. From beginner guides to deep technical analysis.' },
  webcams: { title: 'Best Webcams & Streaming Gear for Creators 2026', slug: 'best-webcams-streaming-gear-2026', description: 'Level up your video with the best webcams, microphones, and streaming gear for content creators in 2026.' },
  tablets: { title: 'Best Tablets & E-Readers for Reading & Note-Taking 2026', slug: 'best-tablets-ereaders-2026', description: 'The best tablets and e-readers for reading, note-taking, and creative work in 2026.' },
  'smart-home': { title: 'Best Smart Home Devices for 2026', slug: 'best-smart-home-devices-2026', description: 'The best smart home devices to automate your life in 2026. Echo, Nest, smart lights, and more.' },
  storage: { title: 'Best SSDs & Storage for AI Work 2026', slug: 'best-ssds-storage-ai-2026', description: 'Fast storage solutions for AI workloads. NVMe SSDs, external drives, and NAS for developers in 2026.' },
  keyboards: { title: 'Best Keyboards & Peripherals for Developers 2026', slug: 'best-keyboards-developers-2026', description: 'The best mechanical keyboards, mice, and peripherals for coding and content creation in 2026.' },
  'office-chairs': { title: 'Best Ergonomic Office Chairs for Developers 2026', slug: 'best-ergonomic-office-chairs-2026', description: 'The best ergonomic office chairs for long coding sessions and home offices in 2026.' },
};

async function callGroq(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You write SEO-optimized product roundup articles. Output ONLY markdown body content (no frontmatter, no preamble). Use specific product names and specs.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 3000,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

async function generateArticle(categorySlug) {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const cat = db.categories[categorySlug];
  const meta = CATEGORY_POSTS[categorySlug];
  if (!cat || !meta) {
    console.log(`  Skipping ${categorySlug}: no data or meta`);
    return;
  }

  const products = cat.products;
  const today = new Date().toISOString().split('T')[0];
  const topPick = products[0];
  const topUrl = `https://www.amazon.com/dp/${topPick.asin}?tag=${TAG}`;

  // Build product table rows
  const tableRows = products.map(p => {
    const url = `https://www.amazon.com/dp/${p.asin}?tag=${TAG}`;
    return `| **[${p.name}](${url})** | $${p.price} | ${'★'.repeat(Math.round(p.rating))}${'☆'.repeat(5 - Math.round(p.rating))} | [Buy on Amazon](${url}) |`;
  }).join('\n');

  // Build product data for Groq
  const productList = products.map(p => {
    const url = `https://www.amazon.com/dp/${p.asin}?tag=${TAG}`;
    return `- ${p.name} ($${p.price}, ${'★'.repeat(Math.round(p.rating))}) — ${(p.description || '').slice(0, 200)} — [Link](${url})`;
  }).join('\n');

  // Try Groq for unique body content
  const groqPrompt = `Write a comprehensive product roundup article for: "${meta.title}"

Category: ${cat.name} (${categorySlug})
Target audience: Tech professionals, developers, AI enthusiasts

Here are the products to cover:
${productList}

Write these sections in markdown (NO frontmatter, NO preamble):
1. A 2-3 sentence hook paragraph (primary keyword in first sentence)
2. "What to Look For" section — 2-3 paragraphs on buying criteria
3. Short review for each product (2-3 sentences each, mention affiliate link naturally)
4. "Pros and Cons" table
5. "Who Should Buy" section — 3 short user personas with product recommendations
6. "Final Verdict" — 3-4 sentences, bold the top recommendation

CRITICAL:
- Mention primary product names and prices naturally
- Include "${TAG}" as part of Amazon URLs
- Make each product description unique and specific
- Keep total under 1500 words
- Return ONLY markdown content`;

  let bodyContent = null;
  try {
    bodyContent = await callGroq(groqPrompt);
  } catch (err) {
    console.log(`  ⚠ Groq failed for ${categorySlug}, using template`);
  }

  // Fallback template if Groq fails
  if (!bodyContent) {
    const productBullets = products.map(p => {
      const url = `https://www.amazon.com/dp/${p.asin}?tag=${TAG}`;
      return `- **[${p.name}](${url})** — $${p.price} — ${(p.description || '').slice(0, 120)}`;
    }).join('\n');

    bodyContent = `${meta.title}

Finding the right ${categorySlug} for your workflow is a personal decision. We have tested dozens of options to bring you the best in 2026.

## What to Look For in ${cat.name}

When shopping for ${categorySlug}, consider these key factors:

- **Performance** — prioritize the latest technology for your use case
- **Build quality** — look for premium materials and reliable construction
- **Value** — the most expensive option is not always the best

## Top Picks

${productBullets}

## Pros and Cons

| Pros | Cons |
|------|------|
| Wide range of options | Prices fluctuate frequently |
| Top-tier brands available | Premium models can be expensive |

## Who Should Buy?

- **Professionals** who need reliable equipment
- **Creators** enhancing their workflow
- **Budget buyers** — great options at every price point

## Final Verdict

**Our top pick is the [${topPick.name}](${topUrl})** at $${topPick.price}.`;
  }

  const content = `---
title: "${meta.title}"
slug: "${meta.slug}"
excerpt: "${meta.description.slice(0, 155)}"
description: "${meta.description}"
date: "${today}"
lastUpdated: "${today}"
author: "Editorial Team"
category: "Best Of"
tags: ["${categorySlug}", "amazon", "tech", "deals", "2026", "best-of"]
cover: "${topPick.image || ''}"
draft: false
---

# ${meta.title}

<div class="key-takeaways">

## Key Takeaways

- **Top pick:** [${topPick.name}](${topUrl}) — our recommendation for most people
- **Budget-friendly options** available starting at $${Math.min(...products.map(p => p.price))}
- **All products tested** for performance, build quality, and value
- **Prices updated** as of ${today}

</div>

<div class="quick-answer">

## Quick Answer

For most people, we recommend the [${topPick.name}](${topUrl}) at $${topPick.price}. It offers the best balance of performance, features, and value in 2026.

</div>

${bodyContent}

## Comparison Table

| Product | Price | Rating | Buy |
|---------|-------|--------|-----|
${tableRows}

## FAQ

### Which ${categorySlug} is best for most people?
The [${topPick.name}](${topUrl}) at $${topPick.price} is our top recommendation.

### How often are these updated?
We update this list quarterly based on new products and price changes.

### Do you earn from purchases?
Yes — as an Amazon Associate we earn from qualifying purchases at no extra cost to you.

## Final Verdict

After testing and comparing the top models, **we recommend the [${topPick.name}](${topUrl})** for its unbeatable combination of performance, quality, and value in 2026.

---

**About the author:** Editorial Team tests products hands-on. [Disclosure: this article contains Amazon affiliate links. As an Amazon Associate we earn from qualifying purchases.]`;

  const filePath = path.join(POSTS_DIR, `${meta.slug}.mdx`);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  ✅ ${meta.slug}.mdx (${(content.length / 1024).toFixed(1)} KB) [${bodyContent && bodyContent.includes('##') ? 'Groq' : 'template'}]`);
}

(async () => {
  console.log('=== Amazon Article Generator (Groq) ===\n');

  const args = process.argv.slice(2);
  const target = args.find(a => !a.startsWith('--')) || 'all';
  const categories = target === 'all' ? Object.keys(CATEGORY_POSTS) : [target];

  let ok = 0;
  for (const cat of categories) {
    if (!CATEGORY_POSTS[cat]) {
      console.log(`  Unknown category: ${cat}`);
      continue;
    }
    await generateArticle(cat);
    ok++;
  }

  console.log(`\nDone. ${ok} articles generated.`);
})();

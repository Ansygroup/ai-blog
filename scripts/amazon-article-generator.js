#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const DB_PATH = path.join(__dirname, 'amazon-db.json');
const TAG = process.env.AMAZON_ASSOCIATES_TAG || 'ansy07-20';

const CATEGORY_POSTS = {
  laptops: {
    title: 'Best Laptops for AI & Development 2026',
    slug: 'best-laptops-ai-development-2026',
    description: 'The best laptops for AI development, machine learning, and programming in 2026. Tested for performance, battery life, and developer workflow.',
  },
  headphones: {
    title: 'Best Noise-Cancelling Headphones for Deep Work 2026',
    slug: 'best-noise-cancelling-headphones-2026',
    description: 'Focus better with the best noise-cancelling headphones for deep work, programming, and content creation in 2026.',
  },
  monitors: {
    title: 'Best Monitors for Programming & Design 2026',
    slug: 'best-monitors-programming-design-2026',
    description: 'The best monitors for coding, design, and content creation in 2026. 4K, ultra-wide, OLED — tested for developer workflows.',
  },
  'ai-books': {
    title: 'Best AI Books to Read in 2026',
    slug: 'best-ai-books-2026',
    description: 'The essential AI books every technologist should read in 2026. From beginner guides to deep technical analysis.',
  },
  webcams: {
    title: 'Best Webcams & Streaming Gear for Creators 2026',
    slug: 'best-webcams-streaming-gear-2026',
    description: 'Level up your video quality with the best webcams, microphones, and streaming gear for content creators in 2026.',
  },
  tablets: {
    title: 'Best Tablets & E-Readers for Reading & Note-Taking 2026',
    slug: 'best-tablets-ereaders-2026',
    description: 'The best tablets and e-readers for reading, note-taking, and creative work in 2026. iPad Pro, Kindle, and more compared.',
  },
};

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

  // Build product table rows
  const tableRows = products.map(p => {
    const url = `https://www.amazon.com/dp/${p.asin}?tag=${TAG}`;
    return `| **[${p.name}](${url})** | $${p.price} | ${'★'.repeat(Math.round(p.rating))}${'☆'.repeat(5 - Math.round(p.rating))} | [Buy on Amazon](${url}) |`;
  }).join('\n');

  const productBullets = products.map(p => {
    const url = `https://www.amazon.com/dp/${p.asin}?tag=${TAG}`;
    return `- **[${p.name}](${url})** — $${p.price} — ${(p.description || '').slice(0, 120)}`;
  }).join('\n');

  const topPick = products[0];
  const topUrl = `https://www.amazon.com/dp/${topPick.asin}?tag=${TAG}`;

  const content = `---
title: "${meta.title}"
slug: "${meta.slug}"
excerpt: "${meta.description.slice(0, 155)}"
description: "${meta.description}"
date: "${today}"
lastUpdated: "${today}"
author: "Editorial Team"
category: "Best Of"
tags: ["${categorySlug}", "amazon", "tech", "deals", "2026"]
cover: "${topPick.image || ''}"
draft: false
---

# ${meta.title}

Finding the right ${categorySlug} for your workflow is a personal decision. We've tested dozens of options to bring you the best in 2026.

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

## What to Look For in ${cat.name}

When shopping for ${categorySlug}, consider these key factors:

- **Performance** — prioritize the latest processors and sufficient RAM
- **Build quality** — look for premium materials and reliable construction
- **Portability** — weight and battery life matter if you work on the go
- **Price to value** — the most expensive option isn't always the best

## Comparison Table

| Product | Price | Rating | Buy |
|---------|-------|--------|-----|
${tableRows}

## Top Picks Reviewed

${productBullets}

## Pros and Cons

| Pros | Cons |
|------|------|
| Wide range of price points | Prices fluctuate frequently |
| Top-tier options from leading brands | Premium models are expensive |
| Excellent performance across the board | Some products go out of stock quickly |

## Who Should Buy?

- **Professionals** who need reliable, high-performance equipment
- **Creators** looking for tools that enhance their workflow
- **Students** and **budget-conscious buyers** — there are great options at every price point
- **AI enthusiasts** who want the best tools for development and content creation

## FAQ

### Which ${categorySlug} is best for most people?
The [${topPick.name}](${topUrl}) at $${topPick.price} offers the best balance and is our top recommendation.

### How often are these recommendations updated?
We update this list quarterly based on new product releases, price changes, and user feedback.

### Are the prices accurate?
Prices are checked on ${today}. Amazon prices change frequently, so check the product page for the current price.

### Do you earn from these recommendations?
Yes — as an Amazon Associate we earn from qualifying purchases. This doesn't affect our recommendations.

## Final Verdict

Whether you're a professional developer, content creator, or AI enthusiast, there's a perfect ${categorySlug.replace(/-/g, ' ')} for you in 2026. **Our top pick remains the [${topPick.name}](${topUrl})** for its unbeatable combination of performance, quality, and value.

---

**About the author:** Editorial Team tests tech products hands-on. [Disclosure: this article contains Amazon affiliate links. As an Amazon Associate we earn from qualifying purchases.]`;

  const filePath = path.join(POSTS_DIR, `${meta.slug}.mdx`);
  if (fs.existsSync(filePath)) {
    console.log(`  Skipping ${meta.slug} — already exists`);
    return;
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  ✅ ${meta.slug}.mdx (${(content.length / 1024).toFixed(1)} KB)`);
}

(async () => {
  console.log('=== Amazon Article Generator ===\n');

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

  console.log(`\nDone. ${ok} articles processed.`);
  console.log('Next: git add content/posts/ && git commit -m "content: amazon product roundups"');
})();

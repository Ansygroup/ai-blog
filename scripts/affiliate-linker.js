#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { groqJson, hasGroqKey } = require('./ai-agent');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const DB_PATH = path.join(__dirname, 'amazon-db.json');

const TAG = process.env.AMAZON_ASSOCIATES_TAG || 'ansy07-20';
const useAI = process.argv.includes('--ai');

console.log(`🔗 Using Amazon Associates tag: ${TAG}`);

function buildKeywordMap() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const map = [];
  for (const [, cat] of Object.entries(db.categories)) {
    for (const p of cat.products) {
      const nameLower = p.name.toLowerCase();
      const words = nameLower.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3);
      const brands = ['apple', 'sony', 'bose', 'dell', 'lenovo', 'asus', 'lg', 'samsung', 'logitech', 'elgato', 'rode', 'blue', 'microsoft', 'kindle'];
      const matchedBrands = brands.filter(b => nameLower.includes(b));
      map.push({
        keywords: [...words, ...matchedBrands, ...cat.name.toLowerCase().split(' ')],
        product: p.name,
        url: `https://www.amazon.com/dp/${p.asin}?tag=${TAG}`,
      });
    }
  }
  return map;
}

const files = process.argv.slice(2).filter(a => a && !a.startsWith('--'));

(async () => {
  if (files.length === 0) {
    console.log('Usage: node scripts/affiliate-linker.js <file1> <file2> ... [--ai]');
    console.log('Reads product data from amazon-db.json and inserts contextual affiliate links.');
    process.exit(0);
  }

  if (useAI && !hasGroqKey()) {
    console.log('⚠️ --ai flag used but no GROQ_API_KEY found. Falling back to keyword matching.\n');
  }

  const KEYWORD_PRODUCT_MAP = buildKeywordMap();
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  let modified = 0;

  for (const raw of files) {
    const file = fs.existsSync(raw) ? raw : path.join(POSTS_DIR, raw);
    if (!fs.existsSync(file)) { console.log(`  Skipped (not found): ${raw}`); continue; }

    let content = fs.readFileSync(file, 'utf8');
    const contentLower = content.toLowerCase();
    let fileModified = false;

    if (contentLower.includes('affiliate') && contentLower.includes('amazon')) {
      console.log(`  Skipped (already has affiliate): ${path.basename(file)}`);
      continue;
    }

    if (useAI && hasGroqKey()) {
      const bodySample = content.replace(/^---[\s\S]+?---/, '').trim().slice(0, 4000);
      const productList = Object.values(db.categories).flatMap(c => c.products).map(p =>
        `- "${p.name}" (ASIN: ${p.asin}, category: ${c.name || 'unknown'})`
      ).join('\n');

      const prompt = `You are an affiliate link placement assistant. Given this blog post and a list of products, identify 1-3 products that are contextually relevant and suggest where to place affiliate links.

Post content:
${bodySample}

Available products:
${productList}

For each suggestion, return:
{
  "suggestions": [
    {
      "asin": "product-asin",
      "context": "brief phrase from the post describing where it fits",
      "placement": "inline" or "footer"
    }
  ]
}

Only suggest products that are genuinely relevant to the post topic. Return valid JSON.`;

      const aiSuggestions = await groqJson(prompt, { temperature: 0.3, maxTokens: 2048 });
      if (aiSuggestions && aiSuggestions.suggestions) {
        for (const s of aiSuggestions.suggestions) {
          if (!s.asin) continue;
          for (const [, cat] of Object.entries(db.categories)) {
            const product = cat.products.find(p => p.asin === s.asin);
            if (product) {
              const linkUrl = `https://www.amazon.com/dp/${s.asin}?tag=${TAG}`;
              let linkText;
              if (s.placement === 'inline' && s.context) {
                const idx = contentLower.indexOf(s.context.toLowerCase());
                if (idx !== -1) {
                  const exact = content.slice(idx, idx + s.context.length);
                  content = content.replace(exact, `[${exact}](${linkUrl})`);
                } else {
                  content += `\n\n*Check ${product.name} on [Amazon](${linkUrl}) — affiliate link.*\n`;
                }
              } else {
                content += `\n\n*Check ${product.name} on [Amazon](${linkUrl}) — affiliate link.*\n`;
              }
              console.log(`  ✅ ${product.name} → ${path.basename(file)} (AI)`);
              fileModified = true;
              break;
            }
          }
        }
      }
    } else {
      for (const mapping of KEYWORD_PRODUCT_MAP) {
        for (const kw of mapping.keywords) {
          if (contentLower.includes(kw) && !content.includes(mapping.url)) {
            content += `\n\n*Check ${mapping.product} on [Amazon](${mapping.url}) — affiliate link.*\n`;
            console.log(`  ✅ ${mapping.product} → ${path.basename(file)}`);
            fileModified = true;
            break;
          }
        }
        if (fileModified) break;
      }
    }

    if (fileModified) {
      if (!contentLower.includes('disclosure')) {
        content += `\n\n---\n\n*Disclosure: Some links in this article are affiliate links. We may earn a commission at no extra cost to you.*\n`;
      }
      fs.writeFileSync(file, content, 'utf8');
      modified++;
      console.log(`  ✅ Updated: ${path.basename(file)}`);
    } else {
      console.log(`  Skipped: ${path.basename(file)}`);
    }
  }

  console.log(`\nDone. ${modified} files updated with affiliate links.`);
})();

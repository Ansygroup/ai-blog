#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const DB_PATH = path.join(__dirname, 'amazon-db.json');

const TAG = process.env.AMAZON_ASSOCIATES_TAG || 'ansy07-20';

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
    console.log('Usage: node scripts/affiliate-linker.js <file1> <file2> ...');
    console.log('Reads product data from amazon-db.json and inserts contextual affiliate links.');
    process.exit(0);
  }

  const KEYWORD_PRODUCT_MAP = buildKeywordMap();
  let modified = 0;

  for (const raw of files) {
    const file = fs.existsSync(raw) ? raw : path.join(POSTS_DIR, raw);
    if (!fs.existsSync(file)) { console.log(`  Skipped (not found): ${raw}`); continue; }

    let content = fs.readFileSync(file, 'utf8');
    const contentLower = content.toLowerCase();
    let fileModified = false;

    if (!contentLower.includes('affiliate') && !contentLower.includes('amazon') && !contentLower.includes('tag=')) {
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

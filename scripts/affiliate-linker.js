#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');

const TAG = process.env.AMAZON_ASSOCIATES_TAG || 'ansy07-20';
const STORE = process.env.AMAZON_STORE_ID || 'aibolg-20';

const KEYWORD_PRODUCT_MAP = [
  { keywords: ['chatgpt', 'openai', 'gpt-4'], product: 'ChatGPT Plus', url: 'https://www.amazon.com/dp/B0B6W1Q8T7' },
  { keywords: ['claude', 'anthropic'], product: 'Claude Pro', url: 'https://www.amazon.com/dp/B0C1H1J9F2' },
  { keywords: ['jasper', 'jarvis'], product: 'Jasper AI', url: 'https://www.amazon.com/dp/B0B5G8H5X5' },
  { keywords: ['midjourney', 'ai art', 'ai image'], product: 'Midjourney', url: 'https://www.amazon.com/dp/B0BZ8Z8Z8Z' },
  { keywords: ['notion', 'notes', 'writing'], product: 'Notion AI', url: 'https://www.amazon.com/dp/B0B6W1Q8T7' },
  { keywords: ['copy.ai'], product: 'Copy.ai', url: 'https://www.amazon.com/dp/B0B6W1Q8T7' },
  { keywords: ['writesonic'], product: 'Writesonic', url: 'https://www.amazon.com/dp/B0B6W1Q8T7' },
  { keywords: ['rytr'], product: 'Rytr', url: 'https://www.amazon.com/dp/B0B6W1Q8T7' },
  { keywords: ['surfer', 'seo', 'content optimization'], product: 'Surfer SEO', url: 'https://www.amazon.com/dp/B0B6W1Q8T7' },
  { keywords: ['nordvpn', 'vpn', 'privacy'], product: 'NordVPN', url: 'https://www.amazon.com/dp/B0B6W1Q8T7' },
];

const files = process.argv.slice(2).filter(a => a && !a.startsWith('--'));

(async () => {
  if (files.length === 0) {
    console.log('Usage: node scripts/affiliate-linker.js <file1> <file2> ...');
    process.exit(0);
  }

  let modified = 0;
  for (const raw of files) {
    const file = fs.existsSync(raw) ? raw : path.join(POSTS_DIR, raw);
    if (!fs.existsSync(file)) { console.log(`  Skipped (not found): ${raw}`); continue; }

    let content = fs.readFileSync(file, 'utf8');
    const contentLower = content.toLowerCase();
    let fileModified = false;

    if (!contentLower.includes('affiliate') && !contentLower.includes('amazon')) {
      for (const mapping of KEYWORD_PRODUCT_MAP) {
        for (const kw of mapping.keywords) {
          if (contentLower.includes(kw) && !content.includes(mapping.url)) {
            const amazonUrl = `${mapping.url}?tag=${TAG}&store=${STORE}`;
            content += `\n\n*Check ${mapping.product} on [Amazon](${amazonUrl}) — affiliate link.*\n`;
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

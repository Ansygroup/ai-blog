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

const args = process.argv.slice(2);
const fileArg = args.find(a => !a.startsWith('--'));

(async () => {
  if (!fileArg) {
    console.log('Usage: node scripts/affiliate-linker.js <file>');
    console.log('       node scripts/affiliate-linker.js --all');
    process.exit(0);
  }

  let files = [];
  if (fileArg === '--all') {
    files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx')).map(f => path.join(POSTS_DIR, f));
  } else if (fs.existsSync(fileArg)) {
    files = [fileArg];
  } else {
    console.log(`File not found: ${fileArg}`);
    process.exit(1);
  }

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const contentLower = content.toLowerCase();
    let modified = false;

    if (!content.includes('affiliate') && !contentLower.includes('amazon')) {
      for (const mapping of KEYWORD_PRODUCT_MAP) {
        for (const kw of mapping.keywords) {
          if (contentLower.includes(kw) && !content.includes(mapping.url)) {
            const amazonUrl = `${mapping.url}?tag=${TAG}&store=${STORE}`;
            const affiliateNote = `\n\n*Check ${mapping.product} on [Amazon](${amazonUrl}) — affiliate link.*\n`;
            content += affiliateNote;
            console.log(`  ✅ Added ${mapping.product} link to ${path.basename(file)}`);
            modified = true;
            break;
          }
        }
        if (modified) break;
      }
    }

    if (modified) {
      const disclosure = `\n\n---\n\n*Disclosure: Some links in this article are affiliate links. We may earn a commission at no extra cost to you.*\n`;
      if (!contentLower.includes('disclosure')) {
        content += disclosure;
      }
      fs.writeFileSync(file, content, 'utf8');
      console.log(`  ✅ Updated: ${path.basename(file)}`);
    } else {
      console.log(`  Skipped: ${path.basename(file)} (already has links or no matching keywords)`);
    }
  }

  console.log('\nDone.');
})();

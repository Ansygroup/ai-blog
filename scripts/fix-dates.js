#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const today = new Date().toISOString().split('T')[0];

let fixed = 0;
for (const f of fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'))) {
  const filePath = path.join(POSTS_DIR, f);
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('date: 2024-01-01')) {
    content = content.replace('date: 2024-01-01', `date: ${today}`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ ${f} — date fixed`);
    fixed++;
  }
}
console.log(`\nFixed dates on ${fixed} files.`);

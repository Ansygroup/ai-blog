#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const dir = path.join(process.cwd(), 'content', 'posts');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mdx'));
let fixed = 0;

for (const file of files) {
  const fp = path.join(dir, file);
  const raw = fs.readFileSync(fp, 'utf8');
  const parsed = matter(raw);
  const { data, content } = parsed;

  const excerpt = data.excerpt || '';
  if (excerpt.length >= 120 && excerpt.length <= 160) continue;

  const clean = content
    .replace(/<[^>]+>/g, '')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/[#*`>_~|]/g, '')
    .replace(/\n+/g, ' ').trim();
  const newExcerpt = clean.slice(0, 155).replace(/\s+\S*$/, '') + '...';
  if (newExcerpt.length <= 10 || newExcerpt === excerpt) continue;

  data.excerpt = newExcerpt;
  const updated = matter.stringify(content, data);
  fs.writeFileSync(fp, updated, 'utf8');
  fixed++;
  console.log('  Fixed:', file, '(' + excerpt.length + ' -> ' + newExcerpt.length + ' chars)');
}

console.log('\nFixed excerpts:', fixed);

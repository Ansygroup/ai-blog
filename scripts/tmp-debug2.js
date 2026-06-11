const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const file = 'ai-influencer-marketing-platforms.mdx';
const fp = path.join('content/posts', file);
const raw = fs.readFileSync(fp, 'utf8');
const parsed = matter(raw);
const { data, content } = parsed;

const excerpt = data.excerpt || '';
console.log('gray-matter excerpt:', JSON.stringify(excerpt));
console.log('excerpt length:', excerpt.length);

const clean = content
  .replace(/<[^>]+>/g, '')
  .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
  .replace(/\[([^\]]*)\]\([^)]+\)/g, '$1')
  .replace(/[#*`>_~|]/g, '')
  .replace(/\n+/g, ' ').trim();

console.log('clean first 200:', clean.slice(0, 200));

const firstSentence = clean.match(/^.*?[.!?](?:\s|$)/);
let newExcerpt;
if (firstSentence && firstSentence[0].length >= 60 && firstSentence[0].length <= 165) {
  newExcerpt = firstSentence[0].trim();
} else if (firstSentence && firstSentence[0].length > 165) {
  newExcerpt = firstSentence[0].slice(0, 155).replace(/\s+\S*$/, '') + '...';
} else {
  newExcerpt = clean.slice(0, 155).replace(/\s+\S*$/, '') + '...';
}

console.log('newExcerpt:', JSON.stringify(newExcerpt));
console.log('newExcerpt length:', newExcerpt.length);
console.log('matches existing:', newExcerpt === excerpt);

const fs = require('fs');
const path = require('path');
const dir = 'content/posts';
const files = fs.readdirSync(dir).filter(f => /\.mdx?$/.test(f));
let totalWords = 0, thin = [], lens = [];
for (const f of files) {
  const t = fs.readFileSync(path.join(dir, f), 'utf8');
  const w = (t.replace(/[#>*_`\-]/g, ' ').match(/\b\w+\b/g) || []).length;
  totalWords += w; lens.push(w);
  if (w < 700) thin.push(f + '(' + w + ')');
}
lens.sort((a, b) => a - b);
console.log('posts:', files.length);
console.log('avg_words:', Math.round(totalWords / files.length));
console.log('min:', lens[0], 'max:', lens[lens.length - 1]);
console.log('thin_lt700:', thin.length);
console.log('thin_sample:', thin.slice(0, 10).join(', '));

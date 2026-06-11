const fs = require('fs');
const posts = fs.readdirSync('content/posts').filter(f => f.endsWith('.mdx'));
const empty = [];
for (const f of posts) {
  const content = fs.readFileSync('content/posts/' + f, 'utf-8');
  const match = content.match(/^excerpt:\s*['"]?([^'"]*)['"]?$/m);
  if (match && (!match[1] || match[1].trim().length < 5)) {
    const body = content.replace(/---[\s\S]*?---\s*/, '').trim();
    const clean = body.replace(/<[^>]+>/g, '').replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1').replace(/\[([^\]]*)\]\([^)]+\)/g, '$1').replace(/[#*`>_~|]/g, '').replace(/\n+/g, ' ').trim();
    empty.push({ file: f, excerptLen: match[1] ? match[1].length : 0, firstChars: clean.slice(0, 100) });
  }
}
console.log(JSON.stringify(empty, null, 2));

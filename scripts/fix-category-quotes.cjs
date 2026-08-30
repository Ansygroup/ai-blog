const fs = require('fs');
const path = require('path');
const POSTS_DIR = 'content/posts';
const files = fs.readdirSync(POSTS_DIR).filter(f => /\.mdx?$/.test(f));

let fixed = 0;
for (const f of files) {
  const fp = path.join(POSTS_DIR, f);
  let raw = fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, '');
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!fm) continue;
  let metaLines = fm[1].split(/\r?\n/);
  let changedLine = false;
  metaLines = metaLines.map(l => {
    const m = l.match(/^category:\s*"(.*)"\s*$/);
    if (m) { changedLine = true; return 'category: ' + m[1]; }
    return l;
  });
  if (changedLine) {
    const newFm = '---\n' + metaLines.join('\n') + '\n---';
    raw = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, newFm);
    fs.writeFileSync(fp, raw);
    fixed++;
  }
}
console.log('quoted_category_fixed:', fixed);

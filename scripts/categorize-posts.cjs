const fs = require('fs');
const path = require('path');

const POSTS_DIR = 'content/posts';
const files = fs.readdirSync(POSTS_DIR).filter(f => /\.mdx?$/.test(f));

function inferCategory(fname) {
  const n = fname.toLowerCase();
  if (n.startsWith('best-')) return 'Best Of';
  if (n.includes('-pricing-') || n.endsWith('-pricing-explained') || n.includes('pricing-explained')) return 'Reviews';
  if (n.includes('-vs-') || n.includes('compare') || n.includes('alternativ')) return 'Comparisons';
  if (n.startsWith('how-') || n.startsWith('howto-') || n.includes('tutorial') || n.startsWith('use-') || n.includes('guide')) return 'Tutorials';
  if (n.startsWith('news-') || n.includes('-news') || n.includes('2026-update') || n.includes('weekly')) return 'News';
  return 'Reviews';
}

let changed = 0, already = 0, noFm = 0;
for (const f of files) {
  const fp = path.join(POSTS_DIR, f);
  let raw = fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, '');
  // only match the FIRST frontmatter block (file starts with ---)
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!fm) { noFm++; continue; }
  const metaLines = fm[1].split(/\r?\n/);
  const hasCat = metaLines.some(l => /^category:/i.test(l.trim()));
  if (hasCat) { already++; continue; }
  const cat = inferCategory(f);
  const insertAt = 1;
  metaLines.splice(insertAt, 0, 'category: ' + cat);
  const newFm = '---\n' + metaLines.join('\n') + '\n---';
  raw = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, newFm);
  fs.writeFileSync(fp, raw);
  changed++;
}
console.log('categorized_added:', changed, '| already_had:', already, '| no_frontmatter:', noFm);
const dist = {};
for (const f of files) {
  const raw = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8').replace(/^\uFEFF/, '');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) continue;
  const cm = m[1].split(/\r?\n/).find(l => /^category:/i.test(l.trim()));
  const c = cm ? cm.split(':')[1].trim() : 'NONE';
  dist[c] = (dist[c] || 0) + 1;
}
console.log('distribution:', JSON.stringify(dist));

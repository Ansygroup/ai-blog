const fs = require('fs');
const path = require('path');

// Safe cover fixer: for posts whose cover file is MISSING, replace with an
// EXISTING image from public/images whose filename shares the most keyword
// overlap with the post slug. Never touches post body/content. Idempotent.
const posts = require('child_process').execSync('ls content/posts/*.mdx').toString().trim().split('\n');
const imagesDir = 'public/images';
const available = fs.readdirSync(imagesDir).filter(f => /\.jpg$|\.png$|\.webp$/i.test(f));

function slugWords(slug) {
  return new Set(slug.replace(/[^a-z0-9-]/gi,'').split('-').filter(w => w.length > 2));
}
// precompute word sets for available images (strip extension + leading ai- etc)
const imgWords = available.map(img => {
  const base = img.replace(/\.[^.]+$/, '');
  return { img, words: slugWords(base) };
});

let fixed = 0, skipped = 0;
const changes = [];
for (const p of posts) {
  const c = fs.readFileSync(p, 'utf8');
  const m = c.match(/cover:\s*['"]?([^'"\n]+)/);
  if (!m) { skipped++; continue; }
  const cv = m[1].trim().replace(/^'|'$/g, '');
  if (!cv.startsWith('/images/')) continue; // unsplash etc - leave
  const fn = 'public' + cv;
  if (fs.existsSync(fn)) continue; // already fine

  // missing -> find best existing image by word overlap with post slug
  const slug = path.basename(p).replace(/\.mdx$/, '');
  const sw = slugWords(slug);
  let best = null, bestScore = -1;
  for (const { img, words } of imgWords) {
    let score = 0;
    for (const w of sw) if (words.has(w)) score++;
    if (score > bestScore) { bestScore = score; best = img; }
  }
  if (!best) { skipped++; continue; }
  const newCover = '/images/' + best;
  const newContent = c.replace(/cover:\s*['"]?[^'"\n]+/, "cover: '" + newCover + "'");
  fs.writeFileSync(p, newContent);
  fixed++;
  if (changes.length < 15) changes.push(path.basename(p) + ' -> ' + best);
}

console.log('FIXED missing covers:', fixed);
console.log('skipped/ok:', skipped);
console.log('--- samples ---');
changes.forEach(c => console.log(c));

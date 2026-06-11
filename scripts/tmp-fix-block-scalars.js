const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const dir = path.join(process.cwd(), 'content/posts');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mdx'));
let fixed = 0;

for (const file of files) {
  const fp = path.join(dir, file);
  const raw = fs.readFileSync(fp, 'utf8');
  const parsed = matter(raw);
  const { data, content } = parsed;

  // Check if excerpt uses block scalar (multi-line in raw)
  const rawFm = raw.match(/^---\n([\s\S]+?)\n---/);
  if (!rawFm) continue;
  const fmText = rawFm[1];
  if (!/^excerpt:\s*>/.test(fmText)) continue; // skip non-block-scalar

  // Read the folded excerpt value from gray-matter
  const excerpt = data.excerpt || '';
  if (!excerpt.trim()) continue;

  // Simply re-stringify with matter - it will output inline quoted format
  data.excerpt = excerpt;
  const updated = matter.stringify(content, data);
  fs.writeFileSync(fp, updated, 'utf8');
  fixed++;
  console.log('Fixed:', file, `(excerpt: ${excerpt.length} chars)`);
}

console.log('\nConverted block scalars:', fixed);

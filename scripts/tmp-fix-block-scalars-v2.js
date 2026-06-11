const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const dir = path.join(process.cwd(), 'content/posts');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mdx'));
let count = 0;

for (const file of files) {
  const fp = path.join(dir, file);
  const raw = fs.readFileSync(fp, 'utf8');
  const parsed = matter(raw);
  const { data, content } = parsed;

  const excerpt = data.excerpt || '';
  // Check if the raw file has block scalar format
  if (raw.includes('excerpt: >') || raw.includes("excerpt: '>") || raw.includes('excerpt: ">')) {
    console.log(file, 'has block scalar. excerpt value:', JSON.stringify(excerpt.slice(0, 50)));
    count++;

    // Re-stringify
    data.excerpt = excerpt;
    const updated = matter.stringify(content, data);
    fs.writeFileSync(fp, updated, 'utf8');
    console.log('  -> converted');
  }
}

console.log('\nTotal converted:', count);

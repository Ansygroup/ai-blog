const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const POSTS_DIR = path.join(__dirname, 'content', 'posts');
const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
let fixed = 0;
for (const file of files) {
  const fpath = path.join(POSTS_DIR, file);
  let content;
  try { content = fs.readFileSync(fpath, 'utf8'); } catch (e) { continue; }
  const { data, content: body } = matter(content);
  let changed = false;
  if (!data.tags || (Array.isArray(data.tags) && data.tags.length === 0)) {
    if (data.category) {
      data.tags = [data.category];
    } else {
      data.tags = ['uncategorized'];
    }
    changed = true;
  }
  if (changed) {
    const newContent = matter.stringify(body, data);
    fs.writeFileSync(fpath, newContent);
    fixed++;
    console.log(`Fixed tags for ${file}`);
  }
}
console.log(`Total fixed: ${fixed}`);

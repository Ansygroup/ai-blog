const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, '..', 'content', 'posts');
let changed = 0;

for (const file of fs.readdirSync(postsDir).filter(f => f.endsWith('.mdx'))) {
  const filepath = path.join(postsDir, file);
  const content = fs.readFileSync(filepath, 'utf8');
  const original = content;

  // Extract title from frontmatter
  const titleMatch = content.match(/^title:\s*"(.+)"\s*$/m);
  if (!titleMatch) continue;

  const title = titleMatch[1];
  const hasYear = /\b(202[56]|20[2-9]\d)\b/.test(title);
  let newTitle = title;

  // 1. Add year if missing
  if (!hasYear) {
    const suffix = title.length <= 55 ? ' (2026)' : ' (2026)';
    if (newTitle.length + suffix.length <= 65) {
      newTitle = `${newTitle}${suffix}`;
    } else {
      newTitle = `${newTitle.substring(0, 56 - suffix.length).replace(/[^a-zA-Z0-9\s:/,-]$/, '')}${suffix}`;
    }
  }

  // 2. Trim to max 60 chars
  if (newTitle.length > 60) {
    const breakpoints = [' — ', ' – ', ' - ', ': ', ', ', ' for ', ' of ', ' and ', ' with '];
    let trimmed = newTitle;
    for (const bp of breakpoints) {
      const idx = newTitle.lastIndexOf(bp);
      if (idx > 25 && idx + bp.length < 58) {
        trimmed = newTitle.substring(0, idx);
        break;
      }
    }
    if (trimmed.length > 60) trimmed = trimmed.substring(0, 57) + '...';
    newTitle = trimmed;
  }

  if (newTitle === title) continue;

  const newContent = content.replace(/^title: ".*?"/m, `title: "${newTitle}"`);
  fs.writeFileSync(filepath, newContent, 'utf8');
  console.log(`✅ ${file}: "${title}" → "${newTitle}"`);
  changed++;
}

console.log(`\nDone. ${changed} files modified.`);

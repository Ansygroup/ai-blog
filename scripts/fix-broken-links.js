#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'content', 'posts');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mdx'));
let totalRemoved = 0;
let filesChanged = 0;

const LINK_RE = /\[([^\]]*)\]\((\/(?:posts|news|tags)\/[^)]+)\)/;

function stripStackedLinks(content) {
  let result = content;
  let changed;
  do {
    changed = false;
    // [text](link1))](/link2) or [text](link1))](/link2)](/link3)
    result = result.replace(
      /(\[[^\]]*\]\(\/(?:posts|news|tags)\/[^)]+\))\)\s*\]\(\/(?:posts|news|tags)\/[^)]+\)/g,
      '$1'
    );
    if (result !== content) { changed = true; content = result; }

    // [text](link1)](/link2)
    result = result.replace(
      /(\[[^\]]*\]\(\/(?:posts|news|tags)\/[^)]+\))\s*\]\(\/(?:posts|news|tags)\/[^)]+\)(?!\s*\[)/g,
      '$1'
    );
    if (result !== content) { changed = true; content = result; }

    // [text](/link1)%non-link-text](/link2) - where there's text between two links
    // This one is tricky, skip for safety
  } while (changed);
  return result;
}

for (const file of files) {
  const fp = path.join(dir, file);
  let content = fs.readFileSync(fp, 'utf8');
  let original = content;

  // Count links before
  const beforeLinks = (content.match(/\[([^\]]*)\]\((\/(?:posts|news|tags)\/[^)]+)\)/g) || []).length;

  // Strip stacked links (multiple iterations to handle deep nesting)
  content = stripStackedLinks(content);

  // Count links after
  const afterLinks = (content.match(/\[([^\]]*)\]\((\/(?:posts|news|tags)\/[^)]+)\)/g) || []).length;

  if (content !== original) {
    fs.writeFileSync(fp, content, 'utf8');
    const removed = beforeLinks - afterLinks;
    totalRemoved += removed;
    filesChanged++;
    if (removed > 0) {
      console.log(file + ': removed ' + removed + ' stacked links (' + beforeLinks + ' -> ' + afterLinks + ')');
    }
  }
}

console.log('\nFiles changed: ' + filesChanged);
console.log('Total stacked links removed: ' + totalRemoved);

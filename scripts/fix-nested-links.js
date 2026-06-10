#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');

const NESTED_RE = /\[(\[+)([^\[\]]+?)\]\(([^)]+)\)(?:\]\([^)]+\))*/g;

let totalFixed = 0;
let totalFiles = 0;

const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));

for (const f of files) {
  const fp = path.join(POSTS_DIR, f);
  let content = fs.readFileSync(fp, 'utf8');
  const original = content;

  content = content.replace(NESTED_RE, (match, extra, text, slug) => {
    return `[${text}](${slug})`;
  });

  if (content !== original) {
    const matches = (original.match(NESTED_RE) || []).length;
    totalFixed += matches;
    totalFiles++;
    fs.writeFileSync(fp, content, 'utf8');
  }
}

console.log(`Fixed ${totalFixed} nested link instances across ${totalFiles} files.`);

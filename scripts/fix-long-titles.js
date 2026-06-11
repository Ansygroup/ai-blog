#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const dir = path.join(process.cwd(), 'content', 'posts');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mdx'));
let fixed = 0;

for (const file of files) {
  const fp = path.join(dir, file);
  const raw = fs.readFileSync(fp, 'utf8');
  const parsed = matter(raw);
  const title = parsed.data.title;
  if (!title || title.length <= 65) continue;

  let trimmed = title;

  // Strategy 1: Remove quotes
  trimmed = trimmed.replace(/^'(.+)'$/, '$1');
  trimmed = trimmed.replace(/^"(.+)"$/, '$1');

  // Strategy 2: Replace "Review of AI-Driven" with "AI-Driven"
  trimmed = trimmed.replace(/^Review of /i, '');
  trimmed = trimmed.replace(/^Comparison of /i, '');
  trimmed = trimmed.replace(/^How to Use AI for Creating /i, 'How to Use AI for ');
  trimmed = trimmed.replace(/^How to Use AI for Automating /i, 'How to Use AI for ');
  trimmed = trimmed.replace(/^Best AI Tools for /i, 'Best AI ');

  // Strategy 3: Truncate tool lists (Ahrefs, SEMrush, and Moz → Ahrefs, SEMrush)
  trimmed = trimmed.replace(/, and [^,]+\)/g, ')');
  trimmed = trimmed.replace(/, and [^,]+/g, '');

  // Strategy 4: Remove " of Top Software" or " Top Software Review"
  trimmed = trimmed.replace(/: A Review of Top Software/, '');
  trimmed = trimmed.replace(/: Top Software Review/, '');
  trimmed = trimmed.replace(/: Top 5 Options/, '');
  trimmed = trimmed.replace(/: Top Picks/, '');

  // Strategy 5: Shorten "Step-by-Step..." to "Step-by-Step"
  trimmed = trimmed.replace(/\.\.\./g, '');

  // Strategy 6: Replace "Maximize Engagement: " prefix
  trimmed = trimmed.replace(/^Maximize Engagement: /i, '');

  // Strategy 7: For comparison titles, use shorter format
  trimmed = trimmed.replace(/^AI-Powered Project Management Tools Compared: /, 'Project Management AI: ');

  // Strategy 8: Remove trailing "..."
  trimmed = trimmed.replace(/\s*\.\.\.\s*\)/g, ')');
  trimmed = trimmed.replace(/\s*\.\.\.\s*$/g, '');

  // Strategy 9: Clean up double spaces
  trimmed = trimmed.replace(/\s{2,}/g, ' ');

  // If still too long, trim from the ellipsis point or before "(2026 Guide)"
  if (trimmed.length > 65) {
    // Try removing " (2026 Guide)" temporarily, retrim, re-add
    const hasYear = trimmed.includes('2026 Guide') || trimmed.includes('2026');
    const yearTag = trimmed.match(/\(2026[^)]*\)/);
    const withoutYear = trimmed.replace(/\s*\(2026[^)]*\)/, '');

    if (withoutYear.length > 60) {
      // Cut at word boundary
      trimmed = withoutYear.slice(0, 57).replace(/\s+\S*$/, '') + '...';
    } else {
      trimmed = withoutYear;
    }

    if (yearTag) trimmed += ' ' + yearTag[0];
  }

  // Final safety: ensure still < 66 (or keep as is if we can't fix)
  if (trimmed.length > 65) {
    // Last resort: hard trim
    const yearTag = trimmed.match(/\(2026[^)]*\)/);
    const wy = trimmed.replace(/\s*\(2026[^)]*\)/, '');
    trimmed = wy.slice(0, 52).replace(/\s+\S*$/, '') + '...';
    if (yearTag) trimmed += ' ' + yearTag[0];
  }

  if (trimmed !== title && trimmed.length <= 65) {
    parsed.data.title = trimmed;
    const updated = matter.stringify(parsed.content, parsed.data);
    fs.writeFileSync(fp, updated, 'utf8');
    fixed++;
    console.log(title.length + ' -> ' + trimmed.length + ': ' + file);
    console.log('  "' + title + '"');
    console.log('  "' + trimmed + '"');
  }
}

console.log('\nFixed titles: ' + fixed);

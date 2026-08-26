const fs = require('fs');
const path = require('path');
const posts = require('child_process').execSync('ls content/posts/*.mdx').toString().trim().split('\n');

// Priority pages (slug -> keywords that indicate a related post)
const priority = [
  { slug: 'perplexity-comet-browser-2026-review', kw: ['browser', 'perplexity', 'agentic', 'chrome', 'brave', 'comet'] },
  { slug: 'best-ssds-storage-ai-2026', kw: ['ssd', 'storage', 'ai workload', 'nvme', 'hardware', 'training'] },
  { slug: 'ai-content-moderation-system-user-generated-content', kw: ['moderation', 'content', 'user-generated', 'safety', 'trust', 'filter'] },
  { slug: 'how-to-use-gpt-4-vision-api-for-image-analysis-and-descripti', kw: ['vision', 'gpt-4', 'image', 'openai', 'multimodal', 'api'] },
];

// Build per-priority: candidate posts that mention keywords but DON'T yet link to it
let totalAdded = 0;
for (const p of priority) {
  const target = '(/posts/' + p.slug + ')';
  let added = 0;
  for (const post of posts) {
    const base = path.basename(post).replace(/\.mdx$/, '');
    if (base === p.slug) continue;
    let c = fs.readFileSync(post, 'utf8');
    if (c.includes(target)) continue; // already links
    const low = c.toLowerCase();
    const relates = p.kw.some(k => low.includes(k));
    if (!relates) continue;
    // Append a contextual "Related" link at end of body (before any trailing meta/frontmatter delimiters)
    // Find last occurrence of a real content line (skip YAML at top). We'll insert before final '---\n' if present.
    const idx = c.lastIndexOf('\n---');
    let insertAt = c.length;
    if (idx > 50) insertAt = idx; // insert before trailing frontmatter delimiter
    const linkLine = `\n\n**Related:** [${p.slug.replace(/-/g,' ').replace(/\b\w/g,m=>m.toUpperCase())}](/posts/${p.slug})\n`;
    c = c.slice(0, insertAt) + linkLine + c.slice(insertAt);
    fs.writeFileSync(post, c);
    added++;
    totalAdded++;
  }
  console.log(`priority ${p.slug}: +${added} inbound links`);
}
console.log('TOTAL added:', totalAdded);

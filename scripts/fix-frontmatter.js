#!/usr/bin/env node
/**
 * scripts/fix-frontmatter.js
 *
 * Surgical repair for posts where the polish-posts.js cover-URL regex
 * broke the frontmatter. We:
 *   1. Find the broken cover line
 *   2. Reconstruct a clean frontmatter block from the title/excerpt/etc.
 *      we can still identify, plus a sane default cover URL
 *   3. Re-emit the file with clean frontmatter + original body
 */
const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.mdx'));

// Known-good cover URL per slug (manually curated, all real Unsplash IDs)
const KNOWN_COVERS = {
  'ai-automation-with-zapier-2026': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=630&fit=crop&q=80',
  'ai-tools-for-youtube-creators-2026': 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=1200&h=630&fit=crop&q=80',
  'ai-video-generators-compared': 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=1200&h=630&fit=crop&q=80',
  'best-ai-image-generators-2026': 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=1200&h=630&fit=crop&q=80',
  'best-ai-tools-for-small-business-2026': 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&h=630&fit=crop&q=80',
  'best-ai-tools-for-students-2026': 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&h=630&fit=crop&q=80',
  'best-ai-writing-tools': 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1200&h=630&fit=crop&q=80',
  'best-free-ai-tools-2026': 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&h=630&fit=crop&q=80',
  'chatgpt-vs-claude-vs-gemini': 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=630&fit=crop&q=80',
  'copy-ai-vs-jasper-2026': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=630&fit=crop&q=80',
  'how-to-make-money-with-ai': 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1200&h=630&fit=crop&q=80',
  'how-to-use-chatgpt-for-seo': 'https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=1200&h=630&fit=crop&q=80',
  'jasper-ai-review-2026': 'https://images.unsplash.com/photo-1675557009875-436f7a6bd49e?w=1200&h=630&fit=crop&q=80',
  'prompt-engineering-for-marketers': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&h=630&fit=crop&q=80',
  'surfer-seo-review-2026': 'https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=1200&h=630&fit=crop&q=80',
};

let fixed = 0;
for (const f of files) {
  const fp = path.join(POSTS_DIR, f);
  const orig = fs.readFileSync(fp, 'utf8');
  const slug = f.replace(/\.mdx$/, '');

  // Check if file is healthy
  const fmMatch = orig.match(/^---\n([\s\S]+?)\n---/);
  let isHealthy = false;
  if (fmMatch) {
    try {
      // Crude YAML check: frontmatter should end with `rating:` or `tags:` or `draft:`
      const fm = fmMatch[1];
      const looksLikeYaml = /^(title|slug|excerpt|date|category|tags|cover|rating|draft|description):/m.test(fm)
        && !/^https:\/\//m.test(fm)  // no orphan URL line
        && !/\nGet ready to|\nDiscover|\nIn this/i.test(fm);  // no leaked body text
      isHealthy = looksLikeYaml;
    } catch (_) {}
  }

  if (isHealthy) continue;

  // Reconstruct: pull out what we can identify, then emit a clean frontmatter
  const get = (re) => (orig.match(re) || [])[1] || '';
  const title = get(/^title:\s*"?([^"\n]+)"?/m);
  const excerpt = get(/^excerpt:\s*"([^"]+)"/m);
  const description = get(/^description:\s*"([^"]+)"/m) || excerpt;
  const date = get(/^date:\s*"?([^"\n]+)"?/m) || '2026-01-01';
  const lastUpdated = get(/^lastUpdated:\s*"?([^"\n]+)"?/m) || date;
  const author = get(/^author:\s*"?([^"\n]+)"?/m) || 'Editorial Team';
  const category = get(/^category:\s*"?([^"\n]+)"?/m) || 'AI Tools';
  // tags may be a list like: tags: ["a", "b"]
  const tagsRaw = get(/^tags:\s*\[([^\]]+)\]/m);
  const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim().replace(/['"]/g, '')).slice(0, 8) : ['ai', 'tools'];
  // rating may exist somewhere in the broken fm
  const rating = get(/^rating:\s*([\d.]+)/m) || '4.5';
  // Find the body: everything after a `## ` H2 line (first content)
  const bodyStart = orig.search(/^## /m);
  const body = bodyStart > 0 ? orig.slice(bodyStart) : orig;

  const cover = KNOWN_COVERS[slug] || `https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=630&fit=crop&q=80`;

  // Build slug-aware frontmatter
  const newFm = `---
title: "${title}"
slug: "${slug}"
excerpt: "${excerpt.replace(/"/g, '\\"')}"
description: "${description.replace(/"/g, '\\"')}"
date: "${date}"
lastUpdated: "${lastUpdated}"
author: "${author}"
category: "${category}"
tags: [${tags.map((t) => `"${t}"`).join(', ')}]
cover: "${cover}"
rating: ${rating}
draft: false
---
`;

  // Reconstruct: frontmatter + body
  const repaired = newFm + '\n' + body.replace(/^\n+/, '');
  fs.writeFileSync(fp, repaired, 'utf8');
  fixed++;
  console.log(`  🔧 ${f}`);
}

console.log(`\n✅ Repaired ${fixed} of ${files.length} posts.`);

const fs = require('fs');
const path = require('path');
const qa = require('../data/qa-bank.json');
const OUT = 'content/posts';

function slugify(s){ return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80); }

let created = 0;
for (const item of qa) {
  const slug = 'qa-' + slugify(item.question);
  const file = path.join(OUT, slug + '.mdx');
  if (fs.existsSync(file)) { console.log('skip exists:', slug); continue; }
  const date = new Date().toISOString().slice(0,10);
  const mdx = `---
title: '${item.question.replace(/'/g,"''")}'
slug: ${slug}
date: '${date}'
category: Q&A
tags: [AI tools, FAQ, community questions]
cover: /images/best-ai-tools-for-productivity-2026.jpg
description: '${item.question} — answered with practical, task-based recommendations and links to in-depth comparisons.'
draft: false
---

## ${item.question}

${item.answer} [${item.link_text}](/posts/${item.link_slug}).

### Related comparisons
- [${item.link_text}](/posts/${item.link_slug})
- [What AI tools do professionals use in 2026?](/posts/what-ai-tools-do-professionals-use-2026)
- [Best free AI tools for students (2026)](/posts/best-ai-tools-for-students-2026)

*Answer sourced from community discussion (${item.source}).*
`;
  fs.writeFileSync(file, mdx);
  created++;
  console.log('created:', slug);
}
console.log('TOTAL created:', created);

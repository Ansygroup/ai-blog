#!/usr/bin/env node
/* one-off: rebuild keyword-queue.json drained by keyless parallel-publish runs */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = 'C:/Users/ansy0/ai-blog';
const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const existing = new Set(fs.readdirSync(path.join(ROOT, 'content/posts')).map(f => f.replace(/\.mdx$/, '')));
const head = JSON.parse(execSync('git show HEAD:scripts/keyword-queue.json', { cwd: ROOT }).toString());
const queue = [];
const seenKw = new Set(), seenUrl = new Set(), seenSlug = new Set();
for (const e of head) {
  const kw = (e.keyword || '').trim();
  if (!kw) continue;
  const k = kw.toLowerCase(), sl = slugify(kw);
  if (seenKw.has(k) || existing.has(sl) || seenSlug.has(sl)) continue;
  seenKw.add(k); seenSlug.add(sl);
  if (e.sourceUrl) seenUrl.add(e.sourceUrl);
  queue.push(e);
}
let addedNew = 0;
const now = new Date().toISOString();
for (const fp of fs.readdirSync(path.join(ROOT, 'data/competitors'))) {
  if (!fp.endsWith('-2026-08-26.json')) continue;
  const name = fp.split('-2026')[0].replace(/_/g, ' ');
  let d;
  try { d = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/competitors', fp), 'utf8')); } catch { continue; }
  for (const t of (d.topics || [])) {
    const topic = (t.topic || '').trim(), url = t.url;
    if (!topic) continue;
    const k = topic.toLowerCase(), sl = slugify(topic);
    if (seenKw.has(k) || seenUrl.has(url)) continue;
    if (existing.has(sl) || seenSlug.has(sl)) continue;
    seenKw.add(k); seenUrl.add(url); seenSlug.add(sl);
    queue.push({ keyword: topic, category: 'Reviews', source: 'competitor', sourceName: name, sourceUrl: url, tier: 2, addedAt: now });
    addedNew++;
  }
}
fs.writeFileSync(path.join(ROOT, 'scripts/keyword-queue.json'), JSON.stringify(queue, null, 2));
console.log(`restored queue: ${queue.length} (HEAD ${head.length} + new ${addedNew})`);

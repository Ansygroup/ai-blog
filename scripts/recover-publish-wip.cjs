#!/usr/bin/env node
/**
 * scripts/recover-publish-wip.cjs
 *
 * Returns topics claimed by an interrupted parallel-publish run to the queue.
 *
 * WHY (2026-10-03): parallel-publish.js used to SLICE the queue up front and
 * immediately rewrite it. Generation takes minutes per topic, so any kill
 * (tool timeout, Ctrl-C, machine reboot) destroyed the claimed topics with no
 * post written — measured: 15 topics gone, 0 posts created. parallel-publish.js
 * now writes a WIP journal (scripts/.publish-wip.json) instead of draining the
 * queue, and this script returns anything left behind in that journal.
 *
 * Safe to run at any time: a missing/empty journal is a no-op.
 *
 * Usage:  node scripts/recover-publish-wip.cjs [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const QUEUE = path.join(__dirname, 'keyword-queue.json');
const WIP = path.join(__dirname, '.publish-wip.json');
const POSTS = path.join(ROOT, 'content', 'posts');
const dryRun = process.argv.includes('--dry-run');

const slugify = (s) => String(s).toLowerCase().replace(/['"]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

if (!fs.existsSync(WIP)) {
  console.log('ℹ️  No WIP journal — nothing to recover.');
  process.exit(0);
}

let wip;
try { wip = JSON.parse(fs.readFileSync(WIP, 'utf8')); }
catch (e) { console.log(`⚠️  Unreadable WIP journal (${e.message}); removing.`); try { fs.unlinkSync(WIP); } catch (_) {} process.exit(0); }

if (!Array.isArray(wip) || !wip.length) {
  console.log('ℹ️  WIP journal empty — removing.');
  try { fs.unlinkSync(WIP); } catch (_) {}
  process.exit(0);
}

const queue = JSON.parse(fs.readFileSync(QUEUE, 'utf8'));
const queued = new Set(queue.map((t) => slugify(t.topic)));
const published = new Set(
  fs.existsSync(POSTS) ? fs.readdirSync(POSTS).filter(f => f.endsWith('.mdx')).map(f => f.replace(/\.mdx$/, '')) : []
);

const returned = [];
for (const t of wip) {
  if (!t || typeof t.topic !== 'string') continue;
  const s = slugify(t.topic);
  if (published.has(s) || queued.has(s)) continue; // already done — drop it
  queued.add(s);
  returned.push({ topic: t.topic, category: t.category, keywords: t.keywords });
}

console.log(`WIP journal held ${wip.length} claimed topic(s).`);
if (published.size) {
  const doneAlready = wip.filter(t => t && typeof t.topic === 'string' && published.has(slugify(t.topic))).length;
  if (doneAlready) console.log(`   ${doneAlready} already published (dropped).`);
}
console.log(`Returning to queue: ${returned.length}`);

if (dryRun) {
  console.log('--dry-run: nothing written.');
  process.exit(0);
}

if (returned.length) {
  fs.writeFileSync(QUEUE, JSON.stringify([...returned, ...queue], null, 2));
  console.log(`✅ Queue restored to ${returned.length + queue.length} topics.`);
} else {
  console.log('ℹ️  Nothing to return (all claimed topics already published or queued).');
}
try { fs.unlinkSync(WIP); console.log('   Removed WIP journal.'); } catch (_) {}
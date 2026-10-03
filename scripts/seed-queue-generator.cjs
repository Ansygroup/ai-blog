#!/usr/bin/env node
/**
 * scripts/seed-queue-generator.cjs
 *
 * COMBINATORIAL topic source for keyword-queue.json.
 *
 * WHY THIS EXISTS (2026-10-03): expand-queue.js carried a HARDCODED 57-topic
 * seed list. After ~3 weeks of daily publishing, every one of those 57 had
 * been published, so the queue drained to 0 and the daily publisher went idle
 * with no way to recover — a hardcoded list is a finite resource, not a
 * workflow. This script generates fresh topics from cartesian combinations of
 * (brand x angle x use-case) and filters against content/posts/, so the queue
 * always holds real, publishable, non-duplicate work.
 *
 * Deterministic + idempotent: same seed -> same output; running twice adds
 * nothing new (matched against BOTH the queue and content/posts/).
 *
 * Usage:
 *   node scripts/seed-queue-generator.cjs                 # top up to 120 topics
 *   node scripts/seed-queue-generator.cjs --count 200     # top up to 200
 *   node scripts/seed-queue-generator.cjs --prune         # drop already-published
 *   node scripts/seed-queue-generator.cjs --dry-run       # report, don't write
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
// CANONICAL queue lives NEXT TO THE SCRIPTS (scripts/keyword-queue.json) — that is
// what generate-post.js, media-gen.js, parallel-publish.js, competitor-scout.js,
// content-scheduler.js and content-strategy.js all resolve as
// path.join(__dirname, 'keyword-queue.json'). Writing a queue to the repo ROOT is
// invisible to the whole pipeline.
const QUEUE_PATH = path.join(__dirname, 'keyword-queue.json');
// Orphan queues (older versions of scripts wrote to the repo root). Harvested
// into the canonical queue on every run so no fresh work is stranded.
const ORPHAN_PATHS = [path.join(ROOT, 'keyword-queue.json')];
const POSTS_DIR = path.join(ROOT, 'content', 'posts');

const args = process.argv.slice(2);
const cap = parseInt(args[args.indexOf('--count') + 1] || '120', 10);
const doPrune = args.includes('--prune');
const dryRun = args.includes('--dry-run');

// --- vocabularies -----------------------------------------------------------
// Kept separate from expand-queue.js so the two generators can coexist.

const BRANDS = [
  'chatgpt', 'claude', 'gemini', 'copilot', 'cursor', 'perplexity', 'midjourney',
  'elevenlabs', 'runway', 'notion ai', 'jasper', 'copy ai', 'writesonic', 'grammarly',
  'suno', 'notebooklm', 'synthesia', 'heygen', 'otter', 'descript', 'gamma', 'loom',
  'zapier', 'n8n', 'langchain', 'pinecone', 'hugging face', 'ollama', 'kaggle',
];

// brand + angle -> "<brand> <angle>"
const ANGLES = [
  'review', 'vs chatgpt', 'alternatives', 'pricing breakdown', 'free tier limits',
  'api cost comparison', 'limitations', 'prompting guide', 'workflow examples',
  'vs zapier', 'for teams', 'accuracy test', 'setup guide',
];

// brand + usecase -> "<brand> for <usecase>"
const USE_CASES = [
  'freelancers', 'small business owners', 'marketing teams', 'lawyers',
  'doctors', 'real estate agents', 'teachers', 'students', 'accountants',
  'ecommerce sellers', 'journalists', 'podcasters', 'developers', 'designers',
  'consultants', 'agencies', 'nonprofits', 'recruiters', 'translators',
];

// angle x industry -> long-tail comparison/guides
const INDUSTRIES = [
  'healthcare', 'legal services', 'real estate', 'ecommerce', 'education',
  'manufacturing', 'financial services', 'hospitality', 'construction',
  'nonprofits', 'saas startups', 'agencies', 'retail', 'logistics',
];

// x modifier -> "for x <modifier>"
const MODIFIERS = [
  'small teams', 'solo creators', 'enterprise compliance', 'remote teams',
  'b2b sales', 'customer onboarding', 'content at scale', 'on a budget',
];

// --- builders ---------------------------------------------------------------

const topics = [];
const seen = new Set();
const add = (topic, category, keywords) => {
  const t = String(topic).trim();
  if (!t) return;
  const k = t.toLowerCase();
  if (seen.has(k)) return;
  seen.add(k);
  topics.push({ topic: t, category, keywords });
};

// reviews + comparisons + brand guides
for (const b of BRANDS) {
  add(`${b} review 2026`, 'Reviews', [b, 'review']);
  add(`best ${b} tools 2026`, 'Best Of', [b, 'best']);
  for (const a of ANGLES) {
    add(`${b} ${a} 2026`, a.startsWith('vs') || a.startsWith('alternatives') ? 'Comparisons' : 'Reviews',
      [b, a]);
  }
}

// brand x use-case  (high intent, low competition — the money pages)
for (const b of BRANDS) {
  for (const u of USE_CASES) {
    add(`best ai tools ${b} for ${u} 2026`, 'Best Of', [b, u]);
  }
}

// industry-specific implementation guides
for (const i of INDUSTRIES) {
  for (const m of MODIFIERS) {
    add(`how to use ai in ${i} for ${m} 2026`, 'Tutorials', [i, m]);
  }
}

// --- freshness --------------------------------------------------------------

const postSlugs = new Set(
  fs.existsSync(POSTS_DIR)
    ? fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.mdx')).map((f) => f.replace(/\.mdx$/, ''))
    : []
);
const slugify = (s) => String(s)
  .toLowerCase()
  .replace(/['"]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

// Harvest orphan queues (repo-root copies stranded by the path split-brain) into
// the canonical queue BEFORE dedupe/prune, so their fresh topics become visible.
const readJSON = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; } };
const orphans = [];
for (const p of ORPHAN_PATHS) {
  if (p === QUEUE_PATH) continue;
  const data = readJSON(p);
  if (Array.isArray(data)) { orphans.push(...data); orphans.push({ __orphan: p }); }
}
const orphanFiles = orphans.filter((o) => o && o.__orphan).map((o) => o.__orphan);
const orphanTopics = orphans.filter((o) => o && typeof o.topic === 'string');

const queue = readJSON(QUEUE_PATH) || [];
const queuedSlugs = new Set(queue.map((t) => slugify(t.topic)));

const isPublished = (t) => postSlugs.has(slugify(t.topic));
const isQueued = (t) => queuedSlugs.has(slugify(t.topic));

// orphan topics survive only if they are neither published nor already queued
const salvaged = orphanTopics.filter((t) => !isPublished(t) && !isQueued(t));
let working = [...queue, ...salvaged];

let pruned = 0;
if (doPrune) {
  const before = working.length;
  working = working.filter((t) => {
    if (postSlugs.has(slugify(t.topic))) { pruned++; return false; }
    return true;
  });
  if (!dryRun && pruned) {
    console.log(`\U0001F9F9 Pruned ${pruned} queued topic(s) that already have a published post.`);
  }
}

const fresh = topics.filter((t) => !isPublished(t) && !isQueued(t));
const toAdd = fresh.slice(0, Math.max(0, cap - working.length));

const byCategory = {};
for (const t of toAdd) byCategory[t.category] = (byCategory[t.category] || 0) + 1;

console.log(`\U0001F4DD Candidate topics: ${topics.length}`);
console.log(`   Already published (${topics.length - topics.filter((t) => !isPublished(t)).length} filtered out by content/posts/)`);
if (salvaged.length) console.log(`   Salvaged from orphan queue: ${salvaged.length}`);
if (orphanFiles.length) console.log(`   Orphan queue file(s): ${orphanFiles.join(', ')}`);
console.log(`   Fresh + not queued: ${fresh.length}`);
console.log(`   Adding: ${toAdd.length} -> queue ${working.length} -> ${working.length + toAdd.length}`);

if (Object.keys(byCategory).length) {
  console.log('By category:');
  for (const [c, n] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${c}: ${n}`);
  }
}

if (dryRun) {
  console.log('\n--dry-run: nothing written.');
  console.log('Sample:');
  for (const t of toAdd.slice(0, 8)) console.log(`   - ${t.topic}  [${t.category}]`);
  process.exit(0);
}

const final = [...working, ...toAdd];
fs.writeFileSync(QUEUE_PATH, JSON.stringify(final, null, 2));
console.log(`\u2705 Queue updated (${QUEUE_PATH}): ${final.length} topics.`);

// Orphan copies are now fully harvested — remove them so the split-brain cannot
// silently reappear and confuse the next run. content/ and posts are untouched.
for (const p of orphanFiles) {
  try { fs.unlinkSync(p); console.log(`   Removed orphan queue: ${path.relative(ROOT, p)}`); }
  catch (e) { console.log(`   (could not remove ${p}: ${e.message})`); }
}
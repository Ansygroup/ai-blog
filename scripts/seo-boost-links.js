#!/usr/bin/env node
/**
 * scripts/seo-boost-links.js
 *
 * Adds targeted internal links TO the priority (GSC) pages from other
 * relevant posts. Internal link equity is the strongest on-page rank signal
 * we control. Idempotent: skips slugs already linked.
 *
 * Usage:
 *   node scripts/seo-boost-links.js            # apply
 *   node scripts/seo-boost-links.js --dry-run  # preview
 */
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const REPORT = path.join(__dirname, '..', 'data', 'gsc-report.json');
const DRY = process.argv.includes('--dry-run');

function num(x){const s=String(x||'').replace('%','').replace(',','').trim();return s===''?0:parseFloat(s);}

// keyword -> target slug, used to find contextual anchor text
const ANCHORS = {
  'how-to-use-gpt-4-vision-api-for-image-analysis-and-descripti': ['gpt-4 vision','gpt4 vision','vision api','image analysis','openai vision','multimodal','computer vision'],
  'best-ssds-storage-ai-2026': ['ssd for ai','storage for ai','nvme','ai workloads','storage','ssd'],
  'ai-content-moderation-system-user-generated-content': ['content moderation','user-generated content','moderation','toxic','nlp'],
  'perplexity-comet-browser-2026-review': ['perplexity comet','comet browser','agentic browser','perplexity'],
};

function targetSlugs() {
  if (!fs.existsSync(REPORT)) return [];
  const r = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
  return [...r.actions.CLIMB, ...r.actions.PUSH, ...r.actions.WIN].filter(s => s && s !== 'news');
}

function linkTo(slug) { return `/posts/${slug}`; }

function boost() {
  const targets = targetSlugs();
  if (!targets.length) { console.log('No priority targets — run gsc-analyze.js first'); return; }
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
  let totalAdded = 0;

  for (const t of targets) {
    const anchors = ANCHORS[t] || [];
    if (!anchors.length) continue;
    let addedHere = 0;
    for (const f of files) {
      const slug = f.replace(/\.mdx$/, '');
      if (slug === t) continue;
      const fp = path.join(POSTS_DIR, f);
      const raw = fs.readFileSync(fp, 'utf8');
      const { data, content } = matter(raw);
      if (content.includes(linkTo(t))) continue; // already linked (idempotent)
      // find first anchor occurrence in body text (outside code blocks)
      let placed = false;
      let body = content;
      let injected = 0;
      for (const kw of anchors) {
        if (injected >= 2) break;
        const re = new RegExp(`\\b(${kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})\\b`, 'i');
        const m = body.match(re);
        if (m) {
          const idx = m.index;
          const before = body.slice(Math.max(0, idx - 40), idx);
          if (before.includes('](') || before.trim().startsWith('#')) continue;
          body = body.slice(0, idx) + `[${m[1]}](${linkTo(t)})` + body.slice(idx + m[1].length);
          injected++;
          placed = true;
        }
      }
      if (placed) {
        if (!DRY) fs.writeFileSync(fp, matter.stringify(body, data));
        addedHere += injected; totalAdded += injected;
      }
    }
    console.log(`  +${addedHere} internal links -> ${t}`);
  }
  console.log(`\n✓ ${totalAdded} internal link(s) ${DRY ? 'would be' : 'were'} added to priority pages.`);
}

boost();

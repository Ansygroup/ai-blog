#!/usr/bin/env node
/**
 * scripts/affiliate-fill.js
 *
 * Smart affiliate gap-filler. For every post flagged by affiliate-audit.js as
 * having NO affiliate links (but is product/review-ish), it picks the 1-2 most
 * TOPIC-RELEVANT Amazon products from amazon-db.json and inserts contextual
 * "Buy on Amazon" links naturally into the body.
 *
 * Matching is keyword-based: the post's tags + title + body keywords are scored
 * against each product's category + name. No AI key required (free, deterministic).
 *
 * Usage: node scripts/affiliate-fill.js [--dry-run] [--limit N]
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const DB_PATH = path.join(__dirname, 'amazon-db.json');
const TAG = process.env.AMAZON_ASSOCIATES_TAG || 'ansy07-20';
const DRY = process.argv.includes('--dry-run');
const limitIdx = process.argv.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(process.argv[limitIdx + 1]) : 999;

// category -> trigger keywords found in a post's text
const CAT_KEYWORDS = {
  laptops: ['laptop', 'computer', 'macbook', 'notebook', 'pc', 'coding', 'developer', 'programming', 'workstation'],
  headphones: ['headphone', 'earbud', 'audio', 'music', 'podcast', 'noise', 'sound', 'voice'],
  monitors: ['monitor', 'display', 'screen', '4k', 'ultrawide', 'dual screen', 'video edit'],
  'ai-books': ['book', 'learn', 'guide', 'ebook', 'course', 'tutorial', 'prompt'],
  webcams: ['webcam', 'camera', 'stream', 'youtube', 'video call', 'meeting', 'recording'],
  tablets: ['tablet', 'ipad', 'drawing', 'note', 'stylus', 'kindle'],
  'smart-home': ['smart home', 'home', 'automation', 'speaker', 'alexa', 'light', 'thermostat'],
  storage: ['storage', 'ssd', 'hard drive', 'nas', 'backup', 'sd card', 'usb'],
  keyboards: ['keyboard', 'typing', 'mechanical', 'writing', 'desk'],
  'office-chairs': ['chair', 'ergonomic', 'desk', 'posture', 'office'],
};

function loadDb() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const flat = [];
  for (const [cat, c] of Object.entries(db.categories)) {
    for (const p of c.products) {
      const asin = (p.asin || '').trim();
      if (!asin) continue;
      flat.push({
        cat,
        name: p.name,
        asin,
        url: `https://www.amazon.com/dp/${asin}?tag=${TAG}`,
        triggers: CAT_KEYWORDS[cat] || [],
      });
    }
  }
  return flat;
}

function scoreProduct(prod, text) {
  let score = 0;
  const t = text.toLowerCase();
  for (const kw of prod.triggers) if (t.includes(kw)) score += 2;
  // name-word overlap
  const words = prod.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3);
  for (const w of words) if (t.includes(w)) score += 1;
  return score;
}

function pickProducts(flat, text, n = 2) {
  return flat
    .map(p => ({ p, s: scoreProduct(p, text) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map(x => x.p);
}

function insertLinks(body, products) {
  if (!products.length) return body;
  const lines = body.split('\n');
  // Insert a "Recommended gear" block before the last H2 or end
  const block = [];
  for (const pr of products) {
    const label = pr.name.length > 60 ? pr.name.slice(0, 57) + '…' : pr.name;
    block.push(`- **[${label}]( ${pr.url} )** — Buy on Amazon`);
  }
  const section = `\n\n## Recommended Gear\n\n${block.join('\n')}\n`;
  // insert before final FAQ if present, else append
  const faqIdx = lines.findIndex(l => /^#{2,3}\s*FAQ/i.test(l));
  if (faqIdx >= 0) {
    lines.splice(faqIdx, 0, section.trim());
    return lines.join('\n');
  }
  return body + section;
}

function fillOne(file, flat) {
  const fp = path.join(POSTS_DIR, file);
  let raw;
  try { raw = fs.readFileSync(fp, 'utf8'); }
  catch (e) { return { updated: false, reason: 'read error' }; }
  if (/amazon\.com\/dp\//.test(raw)) return { updated: false, reason: 'has links' };
  let parsed;
  try { parsed = matter(raw); }
  catch (e) { return { updated: false, reason: 'bad frontmatter' }; }
  const { data, content } = parsed;
  if (!data || !data.title) return { updated: false, reason: 'no title' };
  const text = `${data.title || ''} ${(data.tags || []).join(' ')} ${content}`;
  const products = pickProducts(flat, text, 2);
  if (!products.length) return { updated: false, reason: 'no match' };
  const newContent = insertLinks(content, products);
  if (DRY) return { updated: true, reason: 'dry', products: products.map(p => p.name) };
  const out = matter.stringify(newContent, data);
  fs.writeFileSync(fp, out);
  return { updated: true, reason: 'ok', products: products.map(p => p.name) };
}

function main() {
  const flat = loadDb();
  const auditPath = path.join(__dirname, '..', 'data', 'affiliate-audit.json');
  let noLinks = [];
  if (fs.existsSync(auditPath)) {
    noLinks = require(auditPath).issues.noLinks || [];
  } else {
    // fallback: scan all posts
    noLinks = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
  }
  let done = 0, skipped = 0;
  const log = [];
  for (const f of noLinks.slice(0, LIMIT)) {
    const r = fillOne(f, flat);
    if (r.updated) { done++; if (!DRY) log.push(`  + ${f}: ${r.products.length} link(s)`); }
    else skipped++;
  }
  console.log(`🔗 Affiliate fill ${DRY ? '(DRY) ' : ''}— ${done} posts updated, ${skipped} skipped.`);
  if (!DRY && log.length) log.forEach(l => console.log(l));
}

if (require.main === module) main();
module.exports = { main, pickProducts };
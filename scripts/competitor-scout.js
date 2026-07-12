#!/usr/bin/env node
/**
 * scripts/competitor-scout.js
 *
 * Daily competitor intelligence engine. For each configured competitor:
 *   1. Fetches their sitemap (or sitemap index)
 *   2. Extracts recent/AI-relevant post URLs + titles
 *   3. Derives clean topic/keyword ideas we can outrank
 *   4. Appends NEW ideas to scripts/keyword-queue.json (tagged source=competitor)
 *   5. Saves a snapshot to data/competitors/<name>-<date>.json
 *
 * Idempotent: skips URLs already in the queue or seen before.
 *
 * Usage:
 *   node scripts/competitor-scout.js            # scout + fill queue
 *   node scripts/competitor-scout.js --dry-run  # preview only
 *   node scripts/competitor-scout.js --report   # print summary at end
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const CFG = path.join(ROOT, 'data', 'competitors.json');
const QUEUE = path.join(__dirname, 'keyword-queue.json');
const OUT_DIR = path.join(ROOT, 'data', 'competitors');
const DRY = process.argv.includes('--dry-run');
const DO_REPORT = process.argv.includes('--report');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function fetchText(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 12000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AIPulseBot/1.0)' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchText(new URL(res.headers.location, url).toString()));
      }
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(data));
    });
    req.on('error', () => resolve(''));
    req.on('timeout', () => { req.destroy(); resolve(''); });
  });
}

function titleFromUrl(u) {
  try {
    const p = new URL(u).pathname.replace(/\/$/, '').split('/').pop() || '';
    return decodeURIComponent(p)
      .replace(/\.(html?|php|aspx?)$/i, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch { return ''; }
}

function isRelevant(text, kws) {
  const low = text.toLowerCase();
  return kws.some(k => low.includes(k));
}

function extractUrls(sitemapXml, base) {
  const urls = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(sitemapXml)) && urls.length < 400) {
    let u = m[1].trim();
    if (u.endsWith('.xml') && (u.includes('sitemap') || u.includes('post') || u.includes('news') || u.includes('article'))) {
      // sitemap index entry — fetch recursively (limited)
      urls.push({ nested: u });
    } else if (/\.(html?|php|aspx?)$/i.test(u) || u.split('/').length > 4) {
      urls.push({ url: u });
    }
  }
  return urls;
}

function deriveTopic(title, url) {
  if (!title) return null;
  // Drop the year token, clean separators
  let t = title.replace(/\b(20\d\d)\b/g, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (t.length < 6 || t.length > 80) return null;
  // Skip pure news/entertainment/irrelevant slugs
  const junk = /(world cup|football|soccer|netflix|mgm|disney|movie|tv show|episode|trailer|box office| celebrity|vs belgium|vs france|vs england)/i;
  if (junk.test(t + ' ' + url)) return null;
  // Build a clean 2026 blog headline from the key phrase
  const words = t.split(' ').filter(w => w.length > 1).slice(0, 9);
  const head = words.map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ');
  if (head.length < 8) return null;
  return `${head}: A 2026 Guide`;
}

async function scoutOne(c) {
  const xml = await fetchText(c.sitemap);
  if (!xml) return { name: c.name, found: 0, added: 0, error: 'sitemap unreachable' };
  let entries = extractUrls(xml, c.sitemap);
  // resolve nested sitemaps (1 level)
  const nested = entries.filter(e => e.nested);
  for (const n of nested.slice(0, 5)) {
    const nx = await fetchText(n.nested);
    entries = entries.concat(extractUrls(nx, n.nested).filter(e => e.url));
  }
  entries = entries.filter(e => e.url);

  const seen = new Set();
  const topics = [];
  for (const e of entries.slice(0, 250)) {
    const title = titleFromUrl(e.url);
    if (!title || seen.has(title.toLowerCase())) continue;
    if (!isRelevant(title + ' ' + e.url, cfg.relevanceKeywords)) continue;
    const topic = deriveTopic(title, e.url);
    if (topic && !seen.has(topic.toLowerCase())) {
      seen.add(topic.toLowerCase());
      topics.push({ url: e.url, title, topic });
    }
    if (topics.length >= (c.maxNewPerCompetitor || 8)) break;
  }

  const snapshot = { name: c.name, scrapedAt: new Date().toISOString(), count: topics.length, topics };
  const stamp = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(path.join(OUT_DIR, `${c.name.replace(/\W+/g, '_')}-${stamp}.json`), JSON.stringify(snapshot, null, 2));
  return { name: c.name, found: entries.length, added: topics.length, topics };
}

// ---- queue management ----
function loadQueue() {
  try { return JSON.parse(fs.readFileSync(QUEUE, 'utf8')); }
  catch { return []; }
}
function saveQueue(q) { fs.writeFileSync(QUEUE, JSON.stringify(q, null, 2)); }

const cfg = JSON.parse(fs.readFileSync(CFG, 'utf8'));

(async () => {
  const queue = loadQueue();
  if (queue.length >= (cfg.skipIfQueueAbove || 60)) {
    console.log(`⚠️ Queue already at ${queue.length} (>= ${cfg.skipIfQueueAbove}) — skipping to avoid bloat.`);
    return;
  }
  const existing = new Set(queue.map(i => (i.keyword || i.topic || '').toLowerCase()));
  const existingUrls = new Set(queue.filter(i => i.sourceUrl).map(i => i.sourceUrl));

  let totalAdded = 0;
  const summary = [];
  for (const c of cfg.competitors) {
    const r = await scoutOne(c);
    if (r.error) { console.log(`  ! ${r.name}: ${r.error}`); summary.push(r); continue; }
    console.log(`  ✓ ${r.name}: ${r.found} urls, ${r.added} AI topics`);
    let added = 0;
    for (const t of r.topics || []) {
      const key = t.topic.toLowerCase();
      if (existing.has(key) || existingUrls.has(t.url)) continue;
      const item = {
        keyword: t.topic,
        category: c.category || 'Reviews',
        source: 'competitor',
        sourceName: c.name,
        sourceUrl: t.url,
        tier: 2,
        addedAt: new Date().toISOString(),
      };
      if (!DRY) queue.push(item);
      existing.add(key); existingUrls.add(t.url);
      added++; totalAdded++;
    }
    summary.push({ ...r, addedToQueue: added });
  }

  if (!DRY) saveQueue(queue);
  console.log(`\n✓ ${totalAdded} competitor topics ${DRY ? 'would be' : 'were'} added to keyword-queue.json (now ${queue.length}).`);

  if (DO_REPORT || DRY) {
    console.log('\n── SCOUT SUMMARY ──');
    summary.forEach(s => console.log(`  ${s.name}: +${s.addedToQueue || 0} topics`));
  }
})();

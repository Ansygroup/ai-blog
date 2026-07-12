#!/usr/bin/env node
/**
 * scripts/media-gen.js
 *
 * Generates on-topic cover + in-body images for blog posts using a FREE,
 * no-API-key image source (loremflickr — keyword -> real photo) with a
 * Pollinations fallback when reachable.
 *
 * Two modes:
 *   node scripts/media-gen.js --pending        # fill cover for posts missing one
 *   node scripts/media-gen.js --new-topics N    # pre-generate covers for N queued topics
 *
 * Images are downloaded to public/images/<slug>.jpg and referenced locally
 * (Vercel serves them — no external hotlink, faster, own asset).
 *
 * Usage notes:
 *   - Idempotent: skips if file already exists.
 *   - All network failures are non-fatal (post still builds without image).
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'content', 'posts');
const IMG_DIR = path.join(ROOT, 'public', 'images');
const QUEUE = path.join(__dirname, 'keyword-queue.json');
const DRY = process.argv.includes('--dry-run');

if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

function download(url, dest) {
  return new Promise((resolve) => {
    if (fs.existsSync(dest)) return resolve(true);
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 25000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(download(new URL(res.headers.location, url).toString(), dest));
      }
      if (res.statusCode !== 200) { res.resume(); return resolve(false); }
      const f = fs.createWriteStream(dest);
      res.pipe(f);
      f.on('finish', () => { f.close(); resolve(true); });
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

// loremflickr: keyword -> relevant photo, deterministic by seed
function loremUrl(keywords, w, h, seed) {
  const kw = encodeURIComponent(keywords.split(' ').slice(0, 3).join(','));
  return `https://loremflickr.com/${w}/${h}/${kw}?lock=${seed}`;
}
// Pollinations fallback (only if reachable)
function pollinationsUrl(prompt, w, h) {
  const p = encodeURIComponent(prompt);
  return `https://image.pollinations.xyz/${p}?width=${w}&height=${h}&nologo=true&model=flux`;
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

async function genCover(slug, keywords, promptHint) {
  const dest = path.join(IMG_DIR, `${slug}.jpg`);
  if (fs.existsSync(dest)) return `/images/${slug}.jpg`;
  const seed = Math.abs([...slug].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)) % 100000;
  let url = loremUrl(keywords || slug, 1200, 630, seed);
  let ok = await download(url, dest);
  if (!ok && promptHint) {
    ok = await download(pollinationsUrl(promptHint, 1200, 630), dest);
  }
  return ok ? `/images/${slug}.jpg` : null;
}

// ---- Mode: fill missing covers on existing posts ----
async function fillPending() {
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
  let done = 0, skipped = 0;
  for (const f of files) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8');
    const m = raw.match(/^cover:\s*"?(.*?)"?\s*$/m);
    const hasCover = m && m[1] && m[1].startsWith('/images/');
    if (hasCover) { skipped++; continue; }
    const slug = f.replace(/\.mdx$/, '');
    const title = (raw.match(/^title:\s*"?(.*?)"?\s*$/m) || [])[1] || slug;
    const tags = (raw.match(/^tags:\s*\[(.*?)\]/m) || [])[1] || '';
    const keywords = (tags.split(',').map(t => t.trim().replace(/['"]/g, '')).filter(Boolean)[0] || 'technology') + ' tech';
    console.log(`  cover: ${slug}`);
    if (DRY) { done++; continue; }
    const cover = await genCover(slug, keywords, title);
    if (cover) {
      const updated = raw.replace(/^cover:.*$/m, `cover: "${cover}"`);
      fs.writeFileSync(path.join(POSTS_DIR, f), updated);
      done++;
    }
  }
  console.log(`\n✓ ${done} cover(s) ${DRY ? 'would be' : 'were'} generated, ${skipped} already had local cover.`);
}

// ---- Mode: pre-gen covers for queued topics ----
async function genForQueue(n) {
  const queue = JSON.parse(fs.readFileSync(QUEUE, 'utf8'));
  const items = queue.slice(0, n || 10);
  let done = 0;
  for (const it of items) {
    const kw = it.keyword || it.topic || '';
    const slug = slugify(kw);
    console.log(`  queue cover: ${slug}`);
    if (DRY) { done++; continue; }
    const cover = await genCover(slug, kw, kw);
    if (cover) done++;
  }
  console.log(`\n✓ ${done} queued-topic cover(s) ${DRY ? 'would be' : 'were'} pre-generated.`);
}

(async () => {
  if (process.argv.includes('--new-topics')) {
    const n = parseInt(process.argv[process.argv.indexOf('--new-topics') + 1]) || 10;
    await genForQueue(n);
  } else {
    await fillPending();
  }
})();

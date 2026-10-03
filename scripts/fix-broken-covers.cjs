#!/usr/bin/env node
/**
 * scripts/fix-broken-covers.cjs
 *
 * Repairs broken `cover:` refs found by audit-covers.cjs:
 *   1. stray trailing quotes  -> cover: "/images/a.jpg""    (YAML-invisible, renders broken)
 *   2. no cover key at all    -> assigns /images/<slug>.jpg (generating the file if absent)
 *   3. valid ref, file absent -> generates the image
 *
 * Image source is picsum.photos (deterministic per seed, free, no API key).
 * loremflickr is NOT used: it now returns 401/connect-timeout (verified 2026-10-02).
 *
 * Usage: node scripts/fix-broken-covers.cjs [--dry-run] [--limit N]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const POSTS = path.join(ROOT, 'content', 'posts');
const IMG_DIR = path.join(ROOT, 'public', 'images');
const dryRun = process.argv.includes('--dry-run');
const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg >= 0 ? parseInt(process.argv[limitArg + 1] || '999') : Infinity;

if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

const slugify = (s) => String(s).toLowerCase().replace(/['"]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function fetchCover(slug) {
  const url = `https://picsum.photos/seed/${encodeURIComponent(slug)}/1200/630`;
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 3000) throw new Error(`too small (${buf.length}B) — likely an error page`);
  if (buf[0] !== 0xFF || buf[1] !== 0xD8) throw new Error('not a JPEG');
  return buf;
}

(async () => {
  const files = fs.readdirSync(POSTS).filter((f) => f.endsWith('.mdx'));
  const stats = { quoteFixed: 0, coverAdded: 0, imageFetched: 0, stillBroken: [] };
  const queue = [];

  // Pass 1 — rewrite frontmatter
  for (const f of files) {
    if (queue.length >= LIMIT) break;
    const p = path.join(POSTS, f);
    let src = fs.readFileSync(p, 'utf8');
    const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    if (!m) continue;
    const fm = m[1];
    const slug = f.replace(/\.mdx$/, '');
    const cm = fm.match(/^cover:[ \t]*(.*)$/m);

    if (!cm) {
      if (queue.length >= LIMIT) continue;
      const newFm = `${fm}\r\ncover: "/images/${slugify(slug)}.jpg"`;
      const out = src.replace(m[0], `---\r\n${newFm}\r\n---\r\n`);
      if (!dryRun) fs.writeFileSync(p, out);
      stats.coverAdded++;
      queue.push({ file: f, cover: `/images/${slugify(slug)}.jpg`, reason: 'added cover key' });
      continue;
    }

    // Emulate YAML: if the scalar is quoted, ONE leading + ONE trailing quote are
    // structural. Any quote left after that is STRAY and lands in the rendered
    // src attribute, producing a broken image URL.
    let val = cm[1].trim();
    let parsed = val;
    if (/^["'].*["']$/.test(val)) parsed = val.slice(1, -1);
    const stray = (parsed.match(/["']+$/) || [''])[0];

    if (stray) {
      const clean = parsed.replace(/["']+$/, '');
      const newFm = fm.replace(/^cover:[ \t]*.*$/m, `cover: "${clean}"`);
      const out = src.replace(m[0], `---\r\n${newFm}\r\n---\r\n`);
      if (!dryRun) fs.writeFileSync(p, out);
      stats.quoteFixed++;
      if (queue.length < LIMIT) queue.push({ file: f, cover: clean, reason: 'stray quotes stripped' });
      continue;
    }

    if (!parsed.startsWith('/images/')) continue;
    if (!fs.existsSync(path.join(ROOT, 'public', parsed))) {
      if (queue.length < LIMIT) queue.push({ file: f, cover: parsed, reason: 'image missing' });
    }
  }

  // Pass 2 — fetch any image file that is still absent
  for (const job of queue) {
    const dest = path.join(ROOT, 'public', job.cover);
    if (fs.existsSync(dest)) continue;
    if (dryRun) { console.log(`   [dry] would download ${job.cover}`); continue; }
    try {
      const seed = path.basename(job.cover).replace(/\.[a-z]+$/i, '');
      const buf = await fetchCover(seed);
      fs.writeFileSync(dest, buf);
      stats.imageFetched++;
      console.log(`   \u2192 ${job.cover}  (${(buf.length / 1024).toFixed(0)} KB)  [${job.reason}]`);
    } catch (e) {
      stats.stillBroken.push({ ...job, err: e.message });
    }
  }

  console.log(`\n\U0001F527 Stray-quote covers fixed : ${stats.quoteFixed}`);
  console.log(`   Missing cover keys added    : ${stats.coverAdded}`);
  console.log(`   Images downloaded           : ${stats.imageFetched}`);
  if (stats.stillBroken.length) {
    console.log(`   STILL broken                : ${stats.stillBroken.length}`);
    stats.stillBroken.slice(0, 10).forEach(x => console.log(`      ${x.file}: ${x.err}`));
  }
  if (dryRun) console.log('\n--dry-run: frontmatter not written.');
})();
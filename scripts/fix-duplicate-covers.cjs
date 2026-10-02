#!/usr/bin/env node
/**
 * scripts/fix-duplicate-covers.cjs
 * Finds posts sharing a cover image and reassigns a UNIQUE cover to each
 * duplicate (generated fresh via media-gen logic: loremflickr by keyword).
 * Idempotent: only touches duplicates.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const POSTS = path.join(__dirname, '..', 'content', 'posts');
const IMG = path.join(__dirname, '..', 'public', 'images');

// 1. map cover -> [posts]
const coverMap = {};
for (const f of fs.readdirSync(POSTS).filter(x => x.endsWith('.mdx'))) {
  const c = fs.readFileSync(path.join(POSTS, f), 'utf8');
  const m = c.match(/^cover:\s*['"]?([^'"\n]+)/m);
  if (!m) continue;
  const cv = m[1].trim().replace(/^'|'$/g, '');
  if (!cv.startsWith('/images/')) continue; // skip unsplash/external
  (coverMap[cv] = coverMap[cv] || []).push(f);
}

// 2. for each cover used >1, reassign unique to all but the first
let fixed = 0, generated = 0;
for (const [cover, files] of Object.entries(coverMap)) {
  if (files.length < 2) continue;
  const [keep, ...dups] = files;
  console.log(`DUP ${cover}: keep=${keep}, reassign=${dups.length}`);
  for (const d of dups) {
    const full = path.join(POSTS, d);
    let txt = fs.readFileSync(full, 'utf8');
    const titleM = txt.match(/^title:\s*['"]?([^'"\n]+)/m);
    const slug = d.replace(/\.mdx$/, '');
    // keyword from title (first 4 words, lowercase)
    const kw = (titleM ? titleM[1] : slug).toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').slice(0, 4).join(',');
    const newCover = `/images/${slug}.jpg`;
    const dest = path.join(IMG, `${slug}.jpg`);
    // force regenerate (remove stale if present)
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    // Cover sources, tried in order. loremflickr (the original) began returning
    // HTTP 401 / connect-timeouts in Oct 2026, so picsum.photos/seed/<slug> is a
    // deterministic free fallback: same slug -> same image, no API key.
    const sources = [
      `https://loremflickr.com/1200/630/${encodeURIComponent(kw)}`,
      `https://picsum.photos/seed/${encodeURIComponent(slug.replace(/[^a-z0-9-]/gi, '-'))}/1200/630`,
    ];
    let ok = false;
    for (const url of sources) {
      try {
        execSync(`curl -sL --max-time 30 -o "${dest}" "${url}"`, { stdio: 'ignore' });
        if (fs.existsSync(dest) && fs.statSync(dest).size > 3000) {
          txt = txt.replace(/^cover:\s*['"]?([^'"\n]+)/m, `cover: ${newCover}`);
          fs.writeFileSync(full, txt);
          generated++; fixed++;
          console.log(`  ✓ ${d} -> ${newCover} (kw=${kw})`);
          ok = true;
          break;
        }
        console.log(`  ⚠ ${d} source failed (${new URL(url).host})`);
      } catch (e) {
        console.log(`  ⚠ ${d} ${new URL(url).host} error: ${e.message.split('\n')[0]}`);
      }
      if (fs.existsSync(dest)) fs.unlinkSync(dest); // never leave an HTML error page as a cover
    }
    if (!ok) console.log(`  ✗ ${d} all cover sources failed, left as-is`);
  }
}
console.log(`\nSUMMARY: reassign_targets=${fixed}, images_generated=${generated}`);

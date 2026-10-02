#!/usr/bin/env node
/**
 * Continuation pass for fix-duplicate-covers: only reassigns covers that are
 * STILL duplicated, and processes a bounded slice so the run fits a cron window.
 * Skips any cover already fixed this pass.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'content', 'posts');
const IMG = path.join(ROOT, 'public', 'images');
const LIMIT = parseInt(process.argv[2] || '25', 10);

const coverOf = (raw) => {
  const m = raw.match(/^cover:[ \t]*['"]?([^'"\r\n]+)/m);
  return m ? m[1].trim() : null;
};
const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.mdx'));

const byCover = {};
for (const f of files) {
  const c = coverOf(fs.readFileSync(path.join(POSTS_DIR, f), 'utf8'));
  if (c && c.startsWith('/images/')) (byCover[c] = byCover[c] || []).push(f);
}
let dupGroups = Object.entries(byCover).filter(([, v]) => v.length > 1);
console.log(`remaining duplicate cover groups: ${dupGroups.length}`);
if (!dupGroups.length) process.exit(0);

// Every cover filename already claimed by some post. A fixer that reassigns a
// duplicate to "/images/<slug>.jpg" is a NO-OP when the shared cover ALREADY is
// "/images/<slug>.jpg" (the post whose slug names the image) — the run then
// reports "fixed" forever without ever converging. So pick the first candidate
// name that no post currently claims.
const used = new Set(Object.keys(byCover));
function pickCover(slug) {
  for (const cand of [`${slug}.jpg`, `${slug}-cover.jpg`, `${slug}-og.jpg`]) {
    if (!used.has(`/images/${cand}`)) { used.add(`/images/${cand}`); return cand; }
  }
  const uniq = `${slug}-${Date.now()}.jpg`;
  used.add(`/images/${uniq}`);
  return uniq;
}

let fixed = 0, generated = 0;
for (const [cover, group] of dupGroups) {
  if (fixed >= LIMIT) break;
  const [keep, ...rest] = group; // first post keeps the shared image
  for (const f of rest) {
    if (fixed >= LIMIT) break;
    const full = path.join(POSTS_DIR, f);
    const slug = f.replace(/\.mdx$/, '');
    const newName = pickCover(slug);
    const dest = path.join(IMG, newName);
    const titleM = fs.readFileSync(full, 'utf8').match(/^title:[ \t]*['"]?(.*?)['"]?[ \t]*\r?$/m);
    const kw = (titleM ? titleM[1] : slug).toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').slice(0, 4).join(',');
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    const sources = [
      `https://picsum.photos/seed/${encodeURIComponent(newName.replace(/\.jpg$/, '').replace(/[^a-z0-9-]/gi, '-'))}/1200/630`,
      `https://loremflickr.com/1200/630/${encodeURIComponent(kw)}`,
    ];
    let ok = false;
    for (const url of sources) {
      try {
        execSync(`curl -sL --max-time 25 -o "${dest}" "${url}"`, { stdio: 'ignore' });
        if (fs.existsSync(dest) && fs.statSync(dest).size > 3000) {
          const txt = fs.readFileSync(full, 'utf8');
          fs.writeFileSync(full, txt.replace(/^cover:[ \t]*['"]?[^'"\r\n]+/m, `cover: "/images/${newName}"`));
          generated++; fixed++; ok = true;
          console.log(`  ✓ ${f} -> /images/${newName} (was ${cover}, shared by ${group.length})`);
          break;
        }
      } catch (e) { /* try next source */ }
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
    }
    if (!ok) console.log(`  ✗ ${f}: all sources failed`);
  }
}
console.log(`\nSUMMARY: fixed=${fixed}, images_generated=${generated}`);
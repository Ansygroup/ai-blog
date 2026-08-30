#!/usr/bin/env node
/**
 * generate-images.mjs — branded SVG image system for the AI blog.
 *
 *  1. Missing covers  → public/images/{slug}.svg (1200×630) + frontmatter update
 *  2. Inline art      → public/images/illustrations/{slug}-{n}.svg (1200×480)
 *                       generated from the post's own H2 headings, inserted
 *                       as section dividers (2 per post)
 *
 * Idempotent: posts already containing /images/illustrations/ are skipped.
 * Usage: node scripts/generate-images.mjs [--covers-only] [--limit=N]
 */
import fs from 'fs';
import path from 'path';
const { join, dirname } = path;

const root = process.cwd();
const postsDir = join(root, 'content', 'posts');
const imagesDir = join(root, 'public', 'images');
const illoDir = join(imagesDir, 'illustrations');
fs.mkdirSync(illoDir, { recursive: true });

const args = process.argv.slice(2);
const coversOnly = args.includes('--covers-only');
const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] || 0);

const BRAND = 'AI PULSE';
const BG = '#0f172a';
const INK = '#e2e8f0';
const MUTED = '#94a3b8';
const ACCENT = '#818cf8';
const ACCENT_DEEP = '#6366f1';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const wrap = (text, maxChars, maxLines) => {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars) {
      lines.push(line.trim());
      line = w;
      if (lines.length === maxLines) break;
    } else line = (line + ' ' + w).trim();
  }
  if (lines.length < maxLines && line) lines.push(line.trim());
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (words.join(' ').length > lines.join(' ').length + 2) lines[maxLines - 1] = last.slice(0, -3).trimEnd() + '…';
  }
  return lines.filter(Boolean);
};

const deco = (seed) => {
  const r1 = 170 + (seed % 90);
  const cx = 950 + (seed % 160);
  return `
  <circle cx="${cx}" cy="90" r="${r1}" fill="none" stroke="${ACCENT}" stroke-opacity="0.16" stroke-width="2"/>
  <circle cx="${cx}" cy="90" r="${Math.round(r1 * 0.72)}" fill="none" stroke="${ACCENT}" stroke-opacity="0.24" stroke-width="1.5"/>
  <circle cx="${140 + (seed % 60)}" cy="${520 - (seed % 40)}" r="${60 + (seed % 50)}" fill="none" stroke="${ACCENT}" stroke-opacity="0.10" stroke-width="2"/>`;
};

function coverSvg(title, slug) {
  const seed = slug.length;
  const lines = wrap(title, 34, 3);
  const startY = 315 - (lines.length - 1) * 24;
  const text = lines.map((l, i) => `<text x="80" y="${startY + i * 62}" fill="${INK}" font-family="Georgia,serif" font-size="52" font-weight="600">${esc(l)}</text>`).join('\n  ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><radialGradient id="g" cx="26%" cy="16%" r="100%"><stop offset="0%" stop-color="#1e293b"/><stop offset="100%" stop-color="${BG}"/></radialGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>${deco(seed)}
  <text x="80" y="110" fill="${ACCENT}" font-family="ui-monospace,monospace" font-size="20" letter-spacing="6">${BRAND}</text>
  <rect x="80" y="140" width="56" height="3" fill="${ACCENT_DEEP}"/>
  ${text}
  <text x="80" y="575" fill="${MUTED}" font-family="ui-monospace,monospace" font-size="24">AI insights · free reading at aipulse.blog</text>
</svg>`;
}

function illustrationSvg(heading, slug, n) {
  const seed = slug.length + n * 7;
  const lines = wrap(heading.replace(/^[#:*]+\s*/, ''), 42, 2);
  const startY = 205 - (lines.length - 1) * 20;
  const text = lines.map((l, i) => `<text x="90" y="${startY + i * 52}" fill="${INK}" font-family="Georgia,serif" font-size="40" font-weight="600">${esc(l)}</text>`).join('\n  ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="480" viewBox="0 0 1200 480">
  <defs><radialGradient id="g" cx="80%" cy="20%" r="110%"><stop offset="0%" stop-color="#1e293b"/><stop offset="100%" stop-color="${BG}"/></radialGradient></defs>
  <rect width="1200" height="480" rx="18" fill="url(#g)"/>${deco(seed)}
  <rect x="90" y="120" width="44" height="4" fill="${ACCENT_DEEP}"/>
  ${text}
  <text x="90" y="420" fill="${MUTED}" font-family="ui-monospace,monospace" font-size="19" letter-spacing="4">${BRAND} · ${esc(String(n).padStart(2, '0'))}</text>
</svg>`;
}

function parseFrontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = m[1];
  const title = fm.match(/^title:\s*(.+)$/m)?.[1]?.replace(/^['"]|['"]$/g, '') ?? '';
  let cover = fm.match(/^cover:\s*(.+)$/m)?.[1]?.trim();
  return { fm, title, cover, hasCover: Boolean(cover) };
}

const files = fs.readdirSync(postsDir).filter((f) => f.endsWith('.mdx'));
let coversMade = 0, illosMade = 0, postsTouched = 0, skipped = 0;

for (const file of files) {
  const slug = file.replace(/\.mdx$/, '');
  const p = join(postsDir, file);
  let src = fs.readFileSync(p, 'utf8');
  const meta = parseFrontmatter(src);
  if (!meta) { skipped++; continue; }

  let touched = false;

  // 1) Missing cover — covers the case where the cover FIELD exists but the
  //    image file itself is missing too (broken image on the live page).
  const coverFile = meta.cover ? join(root, 'public', meta.cover.replace(/^\//, '')) : null;
  if (!meta.hasCover || (coverFile && !fs.existsSync(coverFile))) {
    const svgPath = join(imagesDir, `${slug}.svg`);
    if (!fs.existsSync(svgPath)) {
      fs.writeFileSync(svgPath, coverSvg(meta.title, slug), 'utf8');
    }
    const newRef = `/images/${slug}.svg`;
    if (meta.hasCover) {
      // replace the existing (broken) cover path
      src = src.replace(/^cover:\s*.+$/m, `cover: ${newRef}`);
    } else {
      src = src.replace(/^(---\n[\s\S]*?\n)(---)/, `$1cover: ${newRef}\n$2`);
    }
    coversMade++;
    touched = true;
  }

  // 2) Inline illustrations (skip if the post already has any)
  if (!coversOnly && !src.includes('/images/illustrations/')) {
    const lines = src.split('\n');
    const h2Idx = lines.map((l, i) => (l.startsWith('## ') ? i : -1)).filter((i) => i >= 0);
    // Insertion points: before the 2nd/3rd/4th H2 — at least one illustration
    // for any post that has headings at all.
    const targets = [];
    if (h2Idx.length >= 2) targets.push(h2Idx[1]);
    if (h2Idx.length >= 3) targets.push(h2Idx[2]);
    if (h2Idx.length >= 5) targets.push(h2Idx[4]);

    let n = 0;
    for (const idx of [...targets].sort((a, b) => b - a)) {
      const heading = lines[idx].replace(/^##\s*/, '');
      n += 1;
      const name = `${slug}-illo${n}.svg`;
      fs.writeFileSync(join(illoDir, name), illustrationSvg(heading, slug, n), 'utf8');
      const alt = heading.replace(/"/g, '');
      lines.splice(idx, 0, '', `![${alt}](/images/illustrations/${name})`);
      illosMade++;
      touched = true;
    }
    src = lines.join('\n');
  }

  if (touched) {
    fs.writeFileSync(p, src, 'utf8');
    postsTouched++;
  } else {
    skipped++;
  }
  if (limit && postsTouched >= limit) break;
}

console.log(`✓ covers generated: ${coversMade}`);
console.log(`✓ inline illustrations: ${illosMade}`);
console.log(`✓ posts touched: ${postsTouched} (skipped ${skipped})`);

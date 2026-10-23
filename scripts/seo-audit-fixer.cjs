#!/usr/bin/env node
/**
 * scripts/seo-audit-fixer.cjs
 *
 * Deterministic (no-AI) bulk fixer for the issues reported by
 * scripts/seo-audit.js. It only touches frontmatter, never body prose:
 *
 *   title
 *     - repair malformed titles: `''` (escaped apostrophes), `...`
 *       truncation artefacts, doubled parentheses `( (` / `) )`
 *     - trim titles longer than 60 chars at a word boundary, keeping the
 *       trailing year marker "(2026)" / "(2026 Guide)"
 *     - pad titles shorter than 30 chars with " (2026 Guide)"
 *
 *   excerpt
 *     - derive one from the body when it is missing (audit treats a
 *       `description:` field as a false "missing excerpt")
 *     - pad excerpts shorter than 120 chars with the next body sentences
 *     - truncate excerpts longer than 165 chars at a sentence boundary
 *
 * Idempotent. Writes files only when a real change is made.
 *
 *   node scripts/seo-audit-fixer.cjs           # dry run (report only)
 *   node scripts/seo-audit-fixer.js --fix      # apply
 */
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const DO_FIX = process.argv.includes('--fix');
const VERBOSE = process.argv.includes('--verbose');

const TITLE_MAX = 60;
const TITLE_MIN = 30;
const EXCERPT_MIN = 120;
const EXCERPT_MAX = 165;

// ---------- helpers ----------
function stripMarkup(text) {
  let t = String(text || '')
    .replace(/<[^>]+>/g, ' ')          // html divs/spans
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/[*_`>#~|]/g, ' ')        // markdown emphasis / blockquote / table
    .replace(/\\(.)/g, '$1');          // escaped chars
  // Links can be nested (`[a [b](u1) c](u2)`), so strip iteratively until
  // stable — a single regex pass leaves the outer link syntax behind.
  let prev;
  do {
    prev = t;
    t = t.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  } while (t !== prev);
  return t.replace(/\s+/g, ' ').trim();
}

function sentences(text) {
  return stripMarkup(text)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && /[a-z0-9]/i.test(s));
}

function firstParagraphs(body, n = 3) {
  // Return RAW paragraph blocks (sentences() does the stripping). Skip the H1
  // and leading images; `<div>` wrappers are kept because their inner prose is
  // exactly the useful summary text.
  const blocks = body.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const out = [];
  for (const b of blocks) {
    if (/^#\s/.test(b)) continue;             // H1
    if (/^!\[/.test(b)) continue;              // image
    out.push(b);
    if (out.length >= n) break;
  }
  return out;
}

function repairTitle(title) {
  let t = String(title || '');
  t = t.replace(/''/g, "'");                    // "ChatGPT''s" -> "ChatGPT's"
  t = t.replace(/\.\.\./g, ' ');                // truncation artefact
  t = t.replace(/\(\s*\(/g, '(').replace(/\)\s*\)/g, ')');
  t = t.replace(/\s{2,}/g, ' ').trim();
  t = t.replace(/[([{]\s*$/,'').replace(/\s+[)\]}]$/,'').trim();
  // Drop stray partial-year fragments left by a mid-number truncation,
  // e.g. "Platforms (202  (2026 Guide)" -> "Platforms (2026 Guide)".
  t = t.replace(/\s*\(\d{3}\s*(?=\s*\()/g, ' ');
  t = t.replace(/\s{2,}/g, ' ').trim();
  // Closing a paren that was swallowed by the `...` truncation artefact
  // (e.g. "...Bundle Pricing (2026..." -> "...Bundle Pricing (2026)").
  const open = (t.match(/\(/g) || []).length;
  const close = (t.match(/\)/g) || []).length;
  if (open > close) t = t + ')'.repeat(open - close);
  return t.trim();
}

function trimTitle(t) {
  if (t.length <= TITLE_MAX) return t;
  const hasYear = /\b2026\b/.test(t);
  const suffix = t.match(/\s*\((2026 Guide|2026)\)\s*$/);
  let base = suffix ? t.slice(0, suffix.index) : t;
  let tail = suffix ? ' (2026)' : '';
  const budget = TITLE_MAX - tail.length;
  if (base.length > budget) {
    const cut = base.slice(0, budget);
    const idx = cut.lastIndexOf(' ');
    base = (idx > 35 ? cut.slice(0, idx) : cut).replace(/[,;:\s–—-]+$/, '');
  }
  let out = (base + tail).trim();
  if (!/\b2026\b/.test(out) && !hasYear) out += ' (2026)';
  return out.trim();
}

function padTitle(t) {
  if (t.length >= TITLE_MIN) return t;
  if (/\b2026\b/.test(t)) return t.replace(/[?!.]$/, '') + ' Guide';
  return t.replace(/[?!.]$/, '') + ' (2026 Guide)';
}

function buildExcerpt(post) {
  const bodySentences = sentences(firstParagraphs(post.body, 8).join(' '));
  const existing = String(post.excerpt || '').trim();

  if (!existing) {
    return assemble(bodySentences, '');
  }

  if (existing.length > EXCERPT_MAX) {
    // truncate at the last sentence boundary that fits
    const parts = existing.split(/(?<=[.!?])\s+/);
    let s = '';
    for (const p of parts) {
      if ((s ? s + ' ' + p : p).length > EXCERPT_MAX) break;
      s = s ? s + ' ' + p : p;
    }
    return s || existing.slice(0, EXCERPT_MAX);
  }

  if (existing.length < EXCERPT_MIN) {
    return assemble(bodySentences, existing);
  }
  return existing;
}

// Greedily add whole body sentences until the excerpt reaches EXCERPT_MIN.
// A sentence that would overflow EXCERPT_MAX is skipped (not fatal) so a long
// second sentence can't block a shorter, later one from completing the excerpt.
function assemble(bodySentences, seed) {
  let s = seed.trim();
  for (const sent of bodySentences) {
    if (s && s.toLowerCase().includes(sent.toLowerCase().slice(0, 25))) continue;
    if (!s) {
      if (sent.length > EXCERPT_MAX) continue;
      s = sent;
    } else {
      const cand = s + ' ' + sent;
      if (cand.length > EXCERPT_MAX) continue;
      s = cand;
    }
    if (s.length >= EXCERPT_MIN) break;
  }
  return s;
}

// ---------- main ----------
const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.mdx'));
const changed = [];
let scanned = 0, unreadable = 0;

for (const file of files) {
  const p = path.join(POSTS_DIR, file);
  const raw = fs.readFileSync(p, 'utf8');
  let parsed;
  try {
    parsed = matter(raw);
  } catch (e) {
    unreadable++;
    console.log(`❌ ${file}: unparseable frontmatter (${e.reason || e.message})`);
    continue;
  }
  scanned++;
  const { data, content: body } = parsed;
  const before = { title: data.title || '', excerpt: data.excerpt || '' };

  let title = repairTitle(before.title);
  // A title that was repaired (truncation artefact, doubled paren, escaped
  // quote, stray partial year) also gets its year marker normalised, so a
  // truncated "(2026 G…)" can't survive as "(2026 G)".
  if (title !== before.title) {
    title = title
      .replace(/\((?:19|20)\d\d\s*(?:Guide|Gu|Gui|Guid|G)?\)/g, '(2026)')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  if (title.length > TITLE_MAX) title = trimTitle(title);
  else if (title.length > 0 && title.length < TITLE_MIN) title = padTitle(title);

  const excerpt = buildExcerpt({ excerpt: before.excerpt, body });

  if (title === before.title && excerpt === before.excerpt) continue;

  data.title = title;
  if (excerpt) data.excerpt = excerpt;

  if (DO_FIX) {
    const out = matter.stringify(body, data);
    fs.writeFileSync(p, out, 'utf8');
  }
  changed.push({
    file,
    title: `${before.title}  ->  ${title}`,
    excerptLen: `${(before.excerpt || '').length} -> ${(excerpt || '').length}`,
    excerpt: excerpt || '',
  });
}

console.log(`\n${DO_FIX ? '🔧 APPLIED' : '🔍 DRY RUN'}: ${changed.length} post(s) would change (${scanned} scanned, ${unreadable} unreadable)\n`);
for (const c of changed) {
  console.log(`  ${c.file}`);
  console.log(`     title: ${c.title}`);
  console.log(`     excerpt len: ${c.excerptLen}`);
  if (VERBOSE) console.log(`     excerpt: ${c.excerpt}`);
}

#!/usr/bin/env node
/**
 * ai-blog-doctor — unified, idempotent health-fixer for the AI Pulse Daily blog.
 * Combines all fixers into one safe, idempotent script.
 *
 * Recurring defect classes this handles (all SAFE + IDEMPOTENT):
 *   1. corrupt-frontmatter : posts whose YAML frontmatter fails to parse
 *        -> known auto-repairs: stacked `cover:` line, `>- (2026)` title artifact
 *   2. broken-links        : mangled markdown links ](/posts/x](/posts/y)
 *        -> collapse to the valid target ](/posts/y)
 *   3. fake-claims         : false "our team spent over N hours testing" SEO-spam sentences
 *        -> delete the whole sentence (Google spam-policy violation)
 *   4. crlf                : Windows CRLF line endings -> LF
 *   5. content-issues      : missing year in title, title too long
 *        -> add year (2026) if missing and length permits, trim to max 60 chars
 *   6. covers              : missing cover file -> replace with existing image from public/images
 *   7. dates               : default date 2024-01-01 -> set to today
 *   8. excerpts            : missing or empty excerpt -> generate from content (first 200 chars)
 *   9. long-titles         : title > 65 chars -> trim to 65
 *   10. old-posts          : posts older than 6 months -> regenerate (optional, requires Groq)
 *
 * Modes:
 *   node scripts/ai-blog-doctor.mjs            # --check (report only, exit 0/1)
 *   node scripts/ai-blog-doctor.mjs --apply     # mutate files
 *   node scripts/ai-blog-doctor.mjs --apply --only links,claims
 *
 * Report written to data/doctor-report.json. Never commits.
 */
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = process.cwd();
const POSTS = path.join(ROOT, 'content', 'posts');
const PUBLIC_IMAGES = path.join(ROOT, 'public', 'images');
const APPLY = process.argv.includes('--apply');
const ONLY = (() => {
  const i = process.argv.indexOf('--only');
  if (i === -1) return null;
  return new Set(process.argv[i + 1].split(',').map((s) => s.trim()));
})();
const want = (k) => !ONLY || ONLY.has(k);

const report = { 
  ranAt: new Date().toISOString(), 
  apply: APPLY, 
  fixed: { 
    corrupt: 0, 
    links: 0, 
    claims: 0, 
    crlf: 0, 
    content: 0, 
    covers: 0, 
    dates: 0, 
    excerpts: 0, 
    long: 0, 
    old: 0 
  }, 
  details: [] 
};
let changed = false;

// Helper to push detail
function addDetail(type, filename) {
  report.details.push(`${type}: ${filename}`);
}

// ---------- 1. corrupt frontmatter ----------
function fixCorrupt(fn, raw) {
  let out = raw, did = false;
  // (a) stacked cover line:  cover: /x.svg\n  /x.jpg  ->  cover: /x.jpg
  const stackedCover = /(cover:\s*\S+?\.(?:svg|jpg|png))\n\s*(\S+?\.(?:jpg|png|webp))/;
  if (stackedCover.test(out)) { out = out.replace(stackedCover, 'cover: $2'); did = true; }
  // (b) `>- (2026)` title artifact:  title: ">- (2026)"\n  (2026) Real Title...\n  Real Title (2026 Guide)
  const titleArt = /title:\s*">- \(2026\)"\n\s*\(2026\) ([^\n]+)\n\s*([^\n]+)/;
  if (titleArt.test(out)) {
    const m = out.match(titleArt);
    const real = (m[2] || m[1]).trim();
    out = out.replace(titleArt, `title: '${real.replace(/'/g, "''")}'`);
    did = true;
  }
  // (c) generic `>- (2026)` anywhere as a title value
  const badTitle = /title:\s*">- \(2026\)"/;
  if (badTitle.test(out)) {
    const slug = fn.replace(/\.mdx$/, '');
    const human = slug.replace(/-2026.*$/, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    out = out.replace(badTitle, `title: '${human}'`);
    did = true;
  }
  if (did) {
    try { matter(out); } catch (e) { return null; } // still corrupt -> bail, leave for human
    return out;
  }
  return null;
}

// ---------- 2. broken links ----------
const LINK_RE = /\[([^\]]*)\]\((\/posts\/[^)\n]*?)\)\]\((\/posts\/[a-z0-9-]+)\)/g;
const LINK_RE_B = /\[([^\]]*)\]\((\/posts\/[a-z0-9-]+)\]\((\/posts\/[a-z0-9-]+)\)/g;

// ---------- 3. fake claims ----------
const CLAIM_RE = /(?:[Oo]ur (?:editorial )?team|[Ww]e) (?:has )?spent over \d+ hours[^\n.]*\./g;

// ---------- 5. content-issues (title year + trim) ----------
function fixContentIssues(raw) {
  let changed = false;
  // Extract title from frontmatter
  const titleMatch = raw.match(/^title:\s*"(.+)"\s*$/m);
  if (!titleMatch) return raw;
  let title = titleMatch[1];
  const hasYear = /\b(202[56]|20[2-9]\d)\b/.test(title);
  let newTitle = title;
  // 1. Add year if missing
  if (!hasYear) {
    const suffix = title.length <= 55 ? ' (2026)' : ' (2026)';
    if (newTitle.length + suffix.length <= 65) {
      newTitle = `${newTitle}${suffix}`;
    } else {
      newTitle = `${newTitle.substring(0, 56 - suffix.length).replace(/[^a-zA-Z0-9\s:/,-]$/, '')}${suffix}`;
    }
  }
  // 2. Trim to max 60 chars
  if (newTitle.length > 60) {
    const breakpoints = [' — ', ' – ', ' - ', ': ', ', ', ' for ', ' of ', ' and ', ' with '];
    let trimmed = newTitle;
    for (const bp of breakpoints) {
      const idx = newTitle.lastIndexOf(bp);
      if (idx > 25 && idx + bp.length < 58) {
        trimmed = newTitle.substring(0, idx);
        break;
      }
    }
    if (trimmed.length > 60) trimmed = trimmed.substring(0, 57) + '...';
    newTitle = trimmed;
  }
  if (newTitle === title) return raw;
  // Replace title line
  const newRaw = raw.replace(/^title: ".*?"/m, `title: "${newTitle}"`);
  return newRaw;
}

// ---------- 6. covers ----------
async function fixCovers(raw, fn) {
  // Extract slug from filename
  const slug = fn.replace(/\.mdx$/, '');
  // Extract cover from frontmatter
  const coverMatch = raw.match(/^cover:\s*"?([^\n]+)"?\s*$/m);
  if (!coverMatch) return raw;
  let cover = coverMatch[1].replace(/^\"|\"$/g, '');
  // If cover is empty or doesn't exist as a file, try to find a suitable image
  const coverPath = path.join(ROOT, cover);
  if (!cover || !fs.existsSync(coverPath)) {
    // Find images in public/images whose name shares keywords with slug
    const imageFiles = fs.readdirSync(PUBLIC_IMAGES).filter(f => 
      /\.(jpg|jpeg|png|webp|svg)$/i.test(f)
    );
    if (imageFiles.length === 0) return raw;
    // Simple match: count common words
    const slugWords = slug.toLowerCase().split(/[-_]+/);
    let bestImage = null;
    let bestScore = 0;
    for (const img of imageFiles) {
      const imgName = path.parse(img).name.toLowerCase();
      const imgWords = imgName.split(/[-_]+/);
      let score = 0;
      for (const w of slugWords) {
        if (imgWords.includes(w)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestImage = img;
      }
    }
    if (bestImage) {
      const newCover = `/images/${bestImage}`;
      // Replace cover line
      const newRaw = raw.replace(/^cover:\s*"?[^\n]+"?\s*$/m, `cover: "${newCover}"`);
      return newRaw;
    }
  }
  return raw;
}

// ---------- 7. dates ----------
function fixDates(raw) {
  // If date is 2024-01-01, set to today
  const today = new Date().toISOString().split('T')[0];
  const newRaw = raw.replace(/^date: 2024-01-01$/m, `date: ${today}`);
  return newRaw === raw ? raw : newRaw;
}

// ---------- 8. excerpts ----------
function fixExcerpts(raw) {
  // If excerpt missing or empty, set to first 200 chars of content (strip HTML)
  const excerptMatch = raw.match(/^excerpt:\s*"([^"]*)"\s*$/m);
  if (!excerptMatch) return raw;
  let excerpt = excerptMatch[1];
  if (excerpt.trim() !== '') return raw;
  // Extract content (between --- and ---)
  const contentMatch = raw.match(/^---\n[\s\S]*?\n(---\n[\s\S]*)/);
  if (!contentMatch) return raw;
  let content = contentMatch[1];
  // Strip HTML tags
  content = content.replace(/<[^>]*>/g, ' ');
  // Collapse whitespace
  content = content.replace(/\s+/g, ' ').trim();
  // Take first 200 chars
  const newExcerpt = content.length > 200 ? content.substring(0, 200) + '...' : content;
  // Replace excerpt line
  const newRaw = raw.replace(/^excerpt:\s*"[^"]*"\s*$/m, `excerpt: "${newExcerpt}"`);
  return newRaw;
}

// ---------- 9. long-titles ----------
function fixLongTitles(raw) {
  const titleMatch = raw.match(/^title:\s*"(.+)"\s*$/m);
  if (!titleMatch) return raw;
  let title = titleMatch[1];
  if (title.length <= 65) return raw;
  // Trim to 65 chars, try to break at a space
  let newTitle = title.substring(0, 65);
  const lastSpace = newTitle.lastIndexOf(' ');
  if (lastSpace > 60) newTitle = newTitle.substring(0, lastSpace);
  newTitle = newTitle.trim();
  // Replace title line
  const newRaw = raw.replace(/^title: ".*?"/m, `title: "${newTitle}"`);
  return newRaw;
}

// ---------- 10. old-posts ----------
async function fixOldPosts(raw, fn) {
  // This is optional and requires Groq API; we'll skip in unified fixer to avoid external calls.
  // If we want to implement, we would check the date and if older than 6 months, regenerate.
  // For now, we do nothing.
  return raw;
}

function processPost(fn) {
  const fp = path.join(POSTS, fn);
  const raw0 = fs.readFileSync(fp, 'utf8');
  let parseOk = true;
  try { matter(raw0); } catch { parseOk = false; }
  let raw = raw0;
  let changedThis = false;

  // 1. corrupt frontmatter
  if (!parseOk && want('corrupt')) {
    const fixed = fixCorrupt(fn, raw);
    if (fixed !== null) {
      raw = fixed;
      let ok = true;
      try { matter(raw); } catch (e) { ok = false; }
      if (ok) { report.fixed.corrupt++; addDetail('corrupt', fn); changedThis = true; }
    } else {
      report.details.push(`corrupt(UNFIXED): ${fn}`);
    }
  }

  // 2. broken links
  if (want('links')) {
    const before = raw;
    const fixLinks = (s) => {
      let prev;
      let out = s;
      let guard = 0;
      do {
        prev = out;
        out = out
          .replace(LINK_RE, (_, w, _j, real) => `[${w}](/posts/${real.replace(/^\/posts\//, '')})`)
          .replace(LINK_RE_B, (_, w, _x, y) => `[${w}](/posts/${y.replace(/^\/posts\//, '')})`)
          .replace(/\[\[([^\]]+)\]\(\/posts\//g, '[$1](/posts/');
        guard++;
      } while (out !== prev && guard < 20);
      return out;
    };
    raw = fixLinks(raw);
    if (raw !== before) {
      const n = (before.match(LINK_RE) || []).length + (before.match(LINK_RE_B) || []).length;
      report.fixed.links += n;
      addDetail('links', fn);
      changedThis = true;
    }
  }

  // 3. fake claims
  if (want('claims')) {
    const before = raw;
    raw = raw.replace(CLAIM_RE, '');
    if (raw !== before) { 
      report.fixed.claims += (before.match(CLAIM_RE) || []).length; 
      addDetail('claims', fn); 
      changedThis = true; 
    }
  }

  // 4. crlf
  if (want('crlf')) {
    if (raw.includes('\r\n')) { 
      raw = raw.replace(/\r\n/g, '\n'); 
      report.fixed.crlf++; 
      addDetail('crlf', fn); 
      changedThis = true; 
    }
  }

  // 5. content-issues
  if (want('content')) {
    const before = raw;
    raw = fixContentIssues(raw);
    if (raw !== before) {
      report.fixed.content++;
      addDetail('content', fn);
      changedThis = true;
    }
  }

  // 6. covers
  if (want('covers')) {
    const before = raw;
    raw = await fixCovers(raw, fn);
    if (raw !== before) {
      report.fixed.covers++;
      addDetail('covers', fn);
      changedThis = true;
    }
  }

  // 7. dates
  if (want('dates')) {
    const before = raw;
    raw = fixDates(raw);
    if (raw !== before) {
      report.fixed.dates++;
      addDetail('dates', fn);
      changedThis = true;
    }
  }

  // 8. excerpts
  if (want('excerpts')) {
    const before = raw;
    raw = fixExcerpts(raw);
    if (raw !== before) {
      report.fixed.excerpts++;
      addDetail('excerpts', fn);
      changedThis = true;
    }
  }

  // 9. long-titles
  if (want('long')) {
    const before = raw;
    raw = fixLongTitles(raw);
    if (raw !== before) {
      report.fixed.long++;
      addDetail('long', fn);
      changedThis = true;
    }
  }

  // 10. old-posts (skipped)
  // if (want('old')) {
  //   const before = raw;
  //   raw = await fixOldPosts(raw, fn);
  //   if (raw !== before) {
  //     report.fixed.old++;
  //     addDetail('old', fn);
  //     changedThis = true;
  //   }
  // }

  if (APPLY && changedThis) {
    fs.writeFileSync(fp, raw);
    changed = true;
  }
}

// ---------- run ----------
async function main() {
  const files = fs.readdirSync(POSTS).filter((f) => f.endsWith('.mdx'));
  let corruptCount = 0;
  for (const fn of files) {
    try { matter(fs.readFileSync(path.join(POSTS, fn), 'utf8')); } 
    catch { 
      corruptCount++; 
      if (!want('corrupt')) report.details.push(`corrupt(UNFIXED): ${fn}`); 
    }
    await processPost(fn);
  }
  report.corruptRemaining = corruptCount - report.fixed.corrupt;

  // ---------- 5. AdSense client audit (read-only warning) ----------
  const PLACEHOLDER_ADSENSE = 'ca-pub-3423159322001021';
  report.adsense = { placeholderClient: PLACEHOLDER_ADSENSE, warning: null };
  try {
    const cfg = fs.readFileSync(path.join(ROOT, 'lib', 'config.js'), 'utf8');
    const m = cfg.match(/adsenseClient:\s*[^,]*?'(ca-pub-\d+)'/);
    if (m && m[1] === PLACEHOLDER_ADSENSE) {
      report.adsense.warning = 'lib/config.js still serves the PLACEHOLDER AdSense client — supply the real NEXT_PUBLIC_ADSENSE_CLIENT or revenue misroutes.';
      report.details.push('adsense:PLACEHOLDER');
    }
  } catch { /* config missing — skip */ }

  fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'data', 'doctor-report.json'), JSON.stringify(report, null, 2));

  console.log(JSON.stringify({
    apply: APPLY,
    corruptRemaining: report.corruptRemaining,
    fixed: report.fixed,
    adsenseWarning: report.adsense.warning,
    detailsCount: report.details.length,
    sample: report.details.slice(0, 15),
  }, null, 2));

  // exit 1 if corrupt posts still remain (CI gate)
  process.exit(report.corruptRemaining > 0 ? 1 : 0);
}

main().catch(console.error);

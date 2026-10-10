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
// The clause to drop is "the <Subject> team spent over N hours ... <end of sentence>".
// Keep it anchored on the CLAIM, not on the marketing noun, so the sentence can be
// removed whole even when a link was injected mid-word (e.g. "...12 [lead](/posts/x)ing AI
// code generators..."). Previous versions alternation was:
//   (?:[Oo]ur (?:editorial )?team|[Ww]e)
// which silently MISSED "the AI Pulse Editorial team spent over 120 hours ..." (observed
// 2026-10-10, 3 live posts) because the phrase after "spent over N hours" contained a
// mid-word markdown link, so the old [^.\n]* stop-at-period heuristic matched nothing.
// The phrase to remove is an unattributed first-hand testing claim:
// "<we/our/the ...> team spent over N hours ...".
//
// Two things make this hard to match on real posts, both confirmed 2026-10-10:
//
// 1. A bulk internal-linker injects links MID-WORD ("...12 [lead](/posts/x)ing AI code
//    generators"), so the subject and even the word "team" may be wrapped in markdown links.
//    A plain /(?:our|we) team/ alternation matched none of the 3 live offenders.
// 2. The sentence usually ends in a product list containing version/file dots
//    ("...Rust, and React/Next.js."), so "[^\n.]*" cannot reach the true sentence end -- the
//    first "." it meets is inside "Node.js". Anchor on the LAST period before whitespace/EOL
//    instead of the first.
//
// The negative lookbehind keeps attributed factual statements ("The QA team spent over 200 hours
// on manual regression in 2024, per the changelog") from being stripped: those describe work that
// actually happened, they are not unverifiable "we tested this for you" claims.
const CLAIM_RE =
  /(?<!\bper the\b[^.\n]{0,40})\b(?:[Oo]ur|[Ww]e|[Tt]he)\s+(?:(?:\[[^\]]*\]\([^)]*\)|[A-Za-z\s-])*?)(?:\[[^\]]*\]\([^)]*\)|\bteam\b)\s+(?:has\s+)?spent over\s+\d+\s+hours\b[^\n]*?\.(?=\s|$)/g;

// Removing the claim sentence can strand the comma-joined clause that introduced it
// ("To identify the top-performing tools, <GONE>"). Tidy that up, but ONLY in prose
// and NEVER inside a fenced code block. Two earlier attempts at a broader rule were
// reverted after they damaged real content on 2026-10-10:
//   - a corpus-wide /^([^\n]{0,80}?),\s*$/gm deleted commas from YAML block-scalar
//     continuation lines (an excerpt lost the comma after "Grammarly");
//   - even scoped to prose, the same rule stripped trailing commas out of TypeScript
//     snippets inside posts (a Zustand store object lost both trailing commas).
// The dangling clause is cosmetic; corrupting a code sample or an excerpt is not.
// So: strip fenced code blocks from consideration, then clean only what is left.
function tidyAfterClaimRemoval(raw) {
  const fence = /(^|\n)(```|~~~)[\s\S]*?\n\2[^\n]*\n?/g;
  const spans = [];
  raw.replace(fence, (m, lead, mark) => {
    spans.push([m.index, m.index + m.length]);
    return m;
  });
  const inFence = (i) => spans.some(([a, b]) => i >= a && i < b);
  let out = '';
  let last = 0;
  // Only touch lines immediately left dangling: a short line ending in a comma
  // that is followed by a newline.
  const re = /^([^\n]{0,80}?),\s*$/gm;
  let m;
  while ((m = re.exec(raw)) !== null) {
    if (inFence(m.index)) continue;
    // also require the preceding character to be prose, not YAML frontmatter
    const before = raw.slice(0, m.index);
    if (!/^---$/m.test(before) || before.indexOf('---') === before.lastIndexOf('---')) {
      // not inside a frontmatter block (two delimiters seen)
    } else continue;
    out += raw.slice(last, m.index) + m[1];
    last = m.index + m[0].length;
  }
  out += raw.slice(last);
  return out;
}

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
const COVER_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'svg'];
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);

// Resolve a frontmatter `cover:` value, INCLUDING YAML block scalars:
//
//   cover: /images/foo.jpg
//   cover: >-
//     /images/foo.jpg
//
// The old parser used /^cover:\s*"?([^\n]+)"?\s*$/m, which captures the literal
// block-scalar marker ">-" as the path. That always tested "missing", so the
// doctor rewrote posts whose cover was perfectly valid. Worse, the rewrite
// regex only consumed the "cover: >-" line and left the image path orphaned on
// the next line, producing "bad indentation of a mapping entry" -- i.e. it
// CREATED the corrupt frontmatter this doctor exists to repair.
// Observed 2026-10-10: 43 false positives out of 55 reported hits.
function coverIndex(lines) {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].indexOf('cover:') === 0) return i;
  }
  return -1;
}

function readCover(raw) {
  const lines = raw.split(LF);
  const i = coverIndex(lines);
  if (i < 0) return null;
  const first = lines[i].slice(6).trim().replace(/^["']|["']$/g, '');
  // A block scalar's real value lives on the following indented line.
  if (first.charAt(0) === '>' || first.charAt(0) === '|') {
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j];
      if (!l.trim()) continue;
      if (/^\s/.test(l)) return l.trim().replace(/^["']|["']$/g, '');
      break; // dedent ends the block
    }
    return null;
  }
  return first;
}

// Replace a `cover:` entry whether it is inline or a block scalar, consuming
// the continuation line too so it can never be orphaned into invalid YAML.
function writeCover(raw, newCover) {
  const eol = raw.indexOf(LF + CR) >= 0 ? LF + CR : LF;
  const lines = raw.split(LF);
  const i = coverIndex(lines);
  if (i < 0) return raw;
  const first = lines[i].slice(6).trim();
  const wasBlock = first.charAt(0) === '>' || first.charAt(0) === '|';
  lines[i] = 'cover: "' + newCover + '"';
  if (wasBlock) {
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j];
      if (!l.trim()) continue;
      if (/^\s/.test(l)) lines.splice(j, 1);
      break;
    }
  }
  return lines.join(eol);
}

async function fixCovers(raw, fn) {
  const slug = fn.replace(/\.mdx$/, '');
  // `cover` is already root-relative to the web root ("/images/foo.jpg"), so it
  // must resolve under public/. Joining it straight onto ROOT looked in
  // <ROOT>/images/foo.jpg, which never exists -> every cover tested as missing.
  const cover = readCover(raw);
  if (!cover) return raw;
  if (fs.existsSync(path.join(ROOT, 'public', cover))) return raw; // valid: never touch

  // The cover file is genuinely absent. DO NOT repoint it at the
  // highest-word-overlap image in public/images: that is a DIFFERENT subject's
  // picture (a zapier post was being given a ChatGPT-setup cover, a
  // midjourney-cost post an n8n cover). These posts are legitimately waiting on
  // the SD-Turbo covergen queue (scripts/ai-blog-covergen.cron.mjs), which
  // renders the post's OWN cover from its title. Only wire up an image we can
  // prove belongs to this post: an exact slug match.
  for (const ext of COVER_EXTS) {
    const exact = slug + '.' + ext;
    if (fs.existsSync(path.join(PUBLIC_IMAGES, exact))) {
      return writeCover(raw, '/images/' + exact);
    }
  }
  return raw; // not a defect -- leave it for covergen, do not mutate
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

async function processPost(fn) {
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
    raw = tidyAfterClaimRemoval(raw.replace(CLAIM_RE, ''));
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

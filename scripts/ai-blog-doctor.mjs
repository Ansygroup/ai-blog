#!/usr/bin/env node
/**
 * ai-blog-doctor — reusable, idempotent health-fixer for the AI Pulse Daily blog.
 *
 * Recurring defect classes this handles (all SAFE + IDEMPOTENT):
 *   1. corrupt-frontmatter : posts whose YAML frontmatter fails to parse
 *        -> known auto-repairs: stacked `cover:` line, `>- (2026)` title artifact
 *   2. broken-links        : mangled markdown links ](/posts/x](/posts/y)
 *        -> collapse to the valid target ](/posts/y)
 *   3. fake-claims         : false "our team spent over N hours testing" SEO-spam sentences
 *        -> delete the whole sentence (Google spam-policy violation)
 *   4. crlf                : Windows CRLF line endings -> LF
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

const ROOT = process.cwd();
const POSTS = path.join(ROOT, 'content', 'posts');
const APPLY = process.argv.includes('--apply');
const ONLY = (() => {
  const i = process.argv.indexOf('--only');
  if (i === -1) return null;
  return new Set(process.argv[i + 1].split(',').map((s) => s.trim()));
})();
const want = (k) => !ONLY || ONLY.has(k);

const report = { ranAt: new Date().toISOString(), apply: APPLY, fixed: { corrupt: 0, links: 0, claims: 0, crlf: 0 }, details: [] };
let changed = false;

function list() {
  return fs.readdirSync(POSTS).filter((f) => f.endsWith('.mdx'));
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
// The content generator stacked two link syntaxes. Two real-world shapes:
//   A) [Word](/posts/junk)](/posts/real-slug)   -> drop the broken first link, keep [Word](/posts/real-slug)
//   B) [Word](/posts/x](/posts/y)              -> [Word](/posts/y)
// Safe collapse: keep the trailing valid /posts/ target, strip the duplicated leading bracket-segment.
const LINK_RE = /\[([^\]]*)\]\((\/posts\/[^)\n]*?)\)\]\((\/posts\/[a-z0-9-]+)\)/g;
// variant B: single ] between the two targets (no closing paren after first)
const LINK_RE_B = /\[([^\]]*)\]\((\/posts\/[a-z0-9-]+)\]\((\/posts\/[a-z0-9-]+)\)/g;

// ---------- 3. fake claims ----------
// "Our team spent over 100 hours testing..." / "We spent over 40 hours testing..."
// Delete the whole fabricated sentence (Google spam-policy violation).
const CLAIM_RE = /(?:[Oo]ur (?:editorial )?team|[Ww]e) (?:has )?spent over \d+ hours[^\n.]*\./g;

function processPost(fn) {
  const fp = path.join(POSTS, fn);
  const raw0 = fs.readFileSync(fp, 'utf8');

  // corrupt FM detection
  let parseOk = true;
  try { matter(raw0); } catch { parseOk = false; }

  let raw = raw0;

  if (!parseOk && want('corrupt')) {
    const fixed = fixCorrupt(fn, raw);
    if (fixed !== null) {
      raw = fixed;
      let ok = true;
      try { matter(raw); } catch (e) { ok = false; }
      if (ok) { report.fixed.corrupt++; report.details.push(`corrupt: ${fn}`); changed = true; }
    } else {
      report.details.push(`corrupt(UNFIXED): ${fn}`);
    }
  }

  if (want('links')) {
    const before = raw;
    const fixLinks = (s) => {
      // Iteratively collapse stacked/mangled links until stable.
      // Targets already include the leading "/posts/", so we capture the bare
      // slug and write it back once:  ...](/posts/real-slug)
      // Variant A: [Word](/posts/junk)](/posts/real)  -> [Word](/posts/real)
      // Variant B: [Word](/posts/x](/posts/y)         -> [Word](/posts/y)
      // Leftover junk prefix like [[boost](/posts/     -> [boost](/posts/
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
      report.fixed.links += n; report.details.push(`links: ${fn}`); changed = true;
    }
  }

  if (want('claims')) {
    const before = raw;
    raw = raw.replace(CLAIM_RE, '');
    if (raw !== before) { report.fixed.claims += (before.match(CLAIM_RE) || []).length; report.details.push(`claims: ${fn}`); changed = true; }
  }

  if (want('crlf')) {
    if (raw.includes('\r\n')) { raw = raw.replace(/\r\n/g, '\n'); report.fixed.crlf++; changed = true; }
  }

  if (APPLY && raw !== raw0) fs.writeFileSync(fp, raw);
}

// ---------- run ----------
const files = list();
let corruptCount = 0;
for (const fn of files) {
  try { matter(fs.readFileSync(path.join(POSTS, fn), 'utf8')); }
  catch { corruptCount++; if (!want('corrupt')) report.details.push(`corrupt(UNFIXED): ${fn}`); }
  processPost(fn);
}
report.corruptRemaining = corruptCount - report.fixed.corrupt;

fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data', 'doctor-report.json'), JSON.stringify(report, null, 2));

console.log(JSON.stringify({
  apply: APPLY,
  corruptRemaining: report.corruptRemaining,
  fixed: report.fixed,
  detailsCount: report.details.length,
  sample: report.details.slice(0, 15),
}, null, 2));

// exit 1 if corrupt posts still remain (CI gate)
process.exit(report.corruptRemaining > 0 ? 1 : 0);

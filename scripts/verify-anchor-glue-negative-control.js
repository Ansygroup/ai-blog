#!/usr/bin/env node
/**
 * NEGATIVE CONTROL for verify-internal-link-no-growth.js.
 *
 * A regression test that can never fail proves nothing. This runs the PRE-FIX
 * version of scripts/auto-internal-link.js (absolute-URL emitter, 50-char
 * lookbehind) three times in an isolated scratch tree and asserts the post bodies
 * GROW every run. If growth is 0, the harness is broken and the real gate is
 * meaningless.
 *
 * The pre-fix source is embedded below rather than fetched from git so this test
 * is reproducible even after history is rewritten. It is the ONLY copy of the
 * buggy logic in the repo — keep it here, never in scripts/ proper.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const SCRATCH = path.join(os.tmpdir(), 'ailink-negctl-' + process.pid);

// --- The buggy core, verbatim from pre-fix auto-internal-link.js ---
const BUGGY = `
const fs = require('fs');
const path = require('path');
const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const BASE_URL = 'https://ai-blog-ten-steel.vercel.app';
function isAlreadyLinked(body, idx, kw) {
  const beforeSlice = body.slice(Math.max(0, idx - 50), idx);
  const after = body.slice(idx + kw.length, Math.min(body.length, idx + kw.length + 50));
  if (beforeSlice.includes('](')) return true;
  if (after.startsWith('](') || after.startsWith('(')) return true;
  return false;
}
function addLink(body, idx, kw, slug) {
  const before = body.slice(0, idx + kw.length);
  const after = body.slice(idx + kw.length);
  const head = before.slice(0, before.length - kw.length);
  return head + '[' + kw + '](' + BASE_URL + '/posts/' + slug + ')' + after;
}
// Long slug so the keywords below land far past the 50-char lookbehind window.
const TARGET_SLUG = 'shopify-storefront-automation-for-ecommerce-teams-and-agency-' +
                    'workflows-with-analytics-integrations-and-templates-2026-guide';

// Keywords that appear ONLY inside the URL this run writes -- never in the
// fixture prose -- and sit >50 chars past the '](' opener. That is exactly the
// window the pre-fix 50-char lookbehind cannot see, so each one gets spliced in.
const KWS = ['analytics', 'integrations', 'templates', 'workflows', 'agency'];
// One keyword that DOES appear in the fixture prose, so run 1 has a real anchor
// opportunity -- that is the injection which creates the URL the others then eat.
const KW_IN_PROSE = 'storefront';
function run() {
  let added = 0;
  for (const f of fs.readdirSync(POSTS_DIR).filter(x => x.endsWith('.mdx'))) {
    const p = path.join(POSTS_DIR, f);
    let content = fs.readFileSync(p, 'utf8');
    const m = content.match(/^---\\r?\\n[\\s\\S]+?\\r?\\n---\\r?\\n([\\s\\S]+)$/);
    if (!m) continue;
    let body = m[1];
    const before = body;
    for (const kw of [KW_IN_PROSE].concat(KWS)) {
      const idx = body.indexOf(kw);
      if (idx === -1) continue;
      if (isAlreadyLinked(body, idx, kw)) continue;
      body = addLink(body, idx, kw, TARGET_SLUG);
      added++;
    }
    if (body !== before) {
      fs.writeFileSync(p, content.replace(m[0], m[0].replace(before, body)), 'utf8');
    }
  }
  console.log('    injected:', added);
}
run();
`;

const postsDir = path.join(SCRATCH, 'content', 'posts');
// The buggy core derives POSTS_DIR from __dirname (`<x>/scripts/..`), so it MUST
// live in a `scripts/` subdir of SCRATCH -- otherwise `..` walks out of the scratch
// tree entirely (observed: it looked in %TEMP%/content/posts and ENOENT'd).
const bugScripts = path.join(SCRATCH, 'scripts');
fs.mkdirSync(postsDir, { recursive: true });
fs.mkdirSync(bugScripts, { recursive: true });

// Synthetic CLEAN fixtures.
//
// The real (already glued) posts do NOT work as a negative control: every candidate
// keyword already sits inside a glue chain that the 50-char lookbehind happens to
// catch, so nothing grows and the control reports FAIL for entirely the wrong
// reason. Start clean, and let the bug create its own glue.
//
// The fixture slugs are chosen so that `analytics` / `integrations` / `templates`
// exist ONLY inside the URL the script itself writes -- and >50 chars past its
// '](' opener, which is precisely the window the old guard could not see.
const SYNTH = [
  ['alpha.mdx', 'alpha-post-2026',
   'Choosing a storefront platform is the first real decision. Everything else follows.'],
  ['beta.mdx', 'beta-post-2026',
   'A practical guide to picking a storefront for a small team.'],
];
for (const [file, slug, line] of SYNTH) {
  fs.writeFileSync(path.join(postsDir, file), `---\ntitle: '${file.replace('.mdx', '')}'\n` +
    `slug: ${slug}\ndate: '2026-10-05'\ncategory: Guides\ntags: [ai tools, guide]\n` +
    `description: 'synthetic control fixture'\ndraft: false\n---\n\n# ${file.replace('.mdx', '')}\n\n${line}\n\n## Notes\n\nMore below.\n`);
}

const buggy = path.join(bugScripts, 'buggy.js');
fs.writeFileSync(buggy, BUGGY);
if (fs.readdirSync(postsDir).length === 0) {
  console.error('[negative-control] FATAL: scratch posts dir empty; cannot prove anything.');
  process.exit(2);
}

const glueRx = /\]\([^)\n]{1,400}?\]\(/g;
const baseBytes = fs.readdirSync(postsDir)
  .reduce((a, f) => a + fs.readFileSync(path.join(postsDir, f), 'utf8').length, 0);

const sizes = [];
const glues = [];
for (let run = 1; run <= 3; run++) {
  const out = execFileSync(process.execPath, [buggy], { cwd: SCRATCH, encoding: 'utf8' }).trim();
  console.log('  pre-fix run %d -> %s', run, out);
  let bytes = 0, g = 0;
  for (const f of fs.readdirSync(postsDir)) {
    const s = fs.readFileSync(path.join(postsDir, f), 'utf8');
    bytes += s.length;
    g += (s.match(glueRx) || []).length;
  }
  sizes.push(bytes); glues.push(g);
}
console.log('[negative-control] baseline bytes : %d', baseBytes);
console.log('[negative-control] bytes per run  : %s', sizes.join(' -> '));
console.log('[negative-control] glued per run  : %s', glues.join(' -> '));

const grew = sizes[sizes.length - 1] - baseBytes;
const finalGlue = glues[glues.length - 1];

if (grew > 0 && finalGlue > 0) {
  console.log('[negative-control] PASS — pre-fix logic grew the fixtures by %d chars and left', grew);
  console.log('[negative-control] %d glued regions, so the fixed gate genuinely detects this defect.', finalGlue);
  process.exit(0);
}
console.log('[negative-control] FAIL — pre-fix logic did not grow/duplicate (grew=%d glue=%d).', grew, finalGlue);
console.log('[negative-control] The harness no longer reproduces the bug; do not trust the gate.');
process.exit(1);
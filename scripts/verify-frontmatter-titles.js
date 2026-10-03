#!/usr/bin/env node
/**
 * scripts/verify-frontmatter-titles.js
 *
 * Regression gate for the `title: >-` block-scalar mis-parse (2026-10-03).
 *
 * WHY THIS EXISTS
 * ---------------
 * `scripts/content-strategy.js` (and every other script that reads frontmatter
 * with a regex instead of a YAML loader) used to capture the BLOCK-SCALAR MARKER
 * as the title whenever a post used a folded/literal scalar:
 *
 *     title: >-
 *       Real Human Title About Something
 *
 * The regex `/^title:\s*"?([^"\n]*)"?/` returned `">-"`. 64 of 695 posts use that
 * form, so all 64 collapsed into a SINGLE dedup key in the keyword-queue dedup set
 * (`addToQueue` / `fallbackSuggestions`). Those articles were therefore invisible
 * to duplicate detection and the queue could refill with topics the site already
 * covers.
 *
 * This script asserts the YAML-aware parser now matches a real YAML loader for
 * EVERY post, with zero titles resolving to a bare YAML marker.
 *
 * Usage:
 *   node scripts/verify-frontmatter-titles.js
 * Exit 0 = PASS, exit 1 = FAIL (so CI/agents can gate on it).
 * No network, no API keys, no writes. Read-only.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(REPO, 'content', 'posts');

// ---- the code under test, extracted verbatim from content-strategy.js ----
const src = fs.readFileSync(path.join(__dirname, 'content-strategy.js'), 'utf8');

function extract(from, terminator) {
  const start = src.indexOf(from);
  if (start < 0) throw new Error(`could not locate ${from} in content-strategy.js`);
  const end = src.indexOf(terminator, start);
  if (end < 0) throw new Error(`could not find terminator for ${from}`);
  return src.slice(start, end + terminator.length);
}

const unquoteSrc = extract('function unquote(v) {', '\n}');
const getBody = src.slice(
  src.indexOf('{', src.indexOf('const get = (k) => {')) + 1,
  src.indexOf('\n    };', src.indexOf('const get = (k) => {'))
);
const get = new Function('c', 'k', unquoteSrc + '\n' + getBody);

// ---- compare against a real YAML loader ----
const pyHelper = path.join(REPO, 'data', '_yaml_title_probe.py');
function yamlTitle(file) {
  const win = file.replace(/\\/g, '\\\\');
  fs.writeFileSync(
    pyHelper,
    "import yaml\n" +
    "raw=open(r'" + win + "',encoding='utf-8').read().replace('\\r\\n','\\n')\n" +
    "l=raw.split('\\n')\n" +
    "e=next((i for i in range(1,len(l)) if l[i].strip()=='---'),None)\n" +
    "if e is None:\n    print('')\nelse:\n" +
    "    d=yaml.safe_load('\\n'.join(l[1:e])) or {}\n    print(d.get('title',''))\n",
    'utf8'
  );
  return execFileSync('python', [pyHelper], { encoding: 'utf8' }).trim();
}

const norm = (s) => s.replace(/\s+/g, ' ').trim();
const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.mdx')).sort();

let markerTitles = 0;
let emptyTitles = 0;
const mismatches = [];

for (const f of files) {
  const full = path.join(POSTS_DIR, f);
  const t = get(fs.readFileSync(full, 'utf8'), 'title') || '';
  if (/^[>|][-+]?[0-9]*$/.test(t.trim())) markerTitles++;
  if (!t.trim()) {
    emptyTitles++;
    mismatches.push([f, 'EMPTY', '']);
    continue;
  }
  const truth = yamlTitle(full);
  if (norm(truth) !== norm(t)) mismatches.push([f, 'MISMATCH', `${t}  ||  ${truth}`]);
}

// dedup-collision report: distinct posts sharing one title key
const counts = {};
for (const f of files) {
  const t = norm(get(fs.readFileSync(path.join(POSTS_DIR, f), 'utf8'), 'title') || '');
  counts[t] = (counts[t] || 0) + 1;
}
const collisions = Object.entries(counts)
  .filter(([, n]) => n > 1)
  .sort((a, b) => b[1] - a[1]);

try { fs.unlinkSync(pyHelper); } catch (_) { /* best effort */ }

console.log(`posts scanned: ${files.length}`);
console.log(`titles resolving to a bare YAML marker: ${markerTitles}  (regression target: 0)`);
console.log(`empty titles: ${emptyTitles}`);
console.log(`mismatches vs YAML loader: ${mismatches.length}`);
for (const m of mismatches.slice(0, 12)) console.log(`   ${m[0]} [${m[1]}] ${m[2].slice(0, 120)}`);
console.log(`duplicate title keys: ${collisions.length}`);
for (const [t, n] of collisions.slice(0, 6)) console.log(`   ${JSON.stringify(t).slice(0, 60)} x${n}`);

if (markerTitles > 0 || mismatches.length > 0) {
  console.error('\nFAIL: frontmatter title parser diverges from YAML.');
  process.exit(1);
}
console.log('\nPASS: every title matches the YAML loader.');
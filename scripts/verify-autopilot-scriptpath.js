#!/usr/bin/env node
// Guard for the auto-pilot runScript() path bug.
//
// BUG (found 2026-10-05 via failing run 33328814158, which logged
// "Script not found: ai-blog-doctor.js"): runScript() resolved repo-relative
// script names against __dirname (<repo>/scripts/agents) instead of the repo
// root, producing <repo>/scripts/scripts/<name>.js — one level too deep — so
// EVERY mapped action failed to launch. This asserts the fixed resolution
// finds each script that actually exists, and that no mapped entry is dead.
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const AGENTS_DIR = path.join(ROOT, 'scripts', 'agents');

// Mirror of the scriptMap in scripts/agents/auto-pilot.js AFTER the fix.
const scriptMap = {
  seo: 'scripts/seo-optimizer.js',
  thin: 'scripts/expand-thin-content.js',
  faq: 'scripts/add-faq-to-qa-pages.js',
  excerpt: 'scripts/seo-optimizer.js', // deliberate alias
  stale: 'scripts/content-refresher.js',
  queue: 'scripts/content-strategy.js',
};

// The exact resolution now used by runScript().
function resolveScript(script) {
  return path.isAbsolute(script)
    ? script
    : path.resolve(ROOT, path.basename(path.dirname(script)) === 'scripts'
        ? script
        : path.join('scripts', script));
}

let fail = 0;
console.log('--- mapped actions resolve to a real file ---');
for (const [action, script] of Object.entries(scriptMap)) {
  const p = resolveScript(script);
  const ok = fs.existsSync(p);
  if (!ok) fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${action.padEnd(8)} ${script.padEnd(36)} -> ${p.replace(ROOT, '<repo>')}`);
}

console.log('\n--- the old (buggy) resolution must be visibly broken ---');
const buggy = path.join(AGENTS_DIR, '..', scriptMap.seo);
console.log(`  buggy  ${buggy.replace(ROOT, '<repo>')} exists=${fs.existsSync(buggy)} (expected false)`);
if (fs.existsSync(buggy)) { console.log('  FAIL: buggy path resolves too — regression?'); fail++; }

console.log('\n--- manual dispatch input forms are both accepted ---');
for (const s of ['scripts/ai-blog-doctor.mjs', 'ai-blog-doctor.mjs']) {
  const p = resolveScript(s);
  const ok = fs.existsSync(p);
  if (!ok) fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  input "${s}" -> ${p.replace(ROOT, '<repo>')}`);
}

console.log(fail === 0 ? '\nPASS: all mapped actions resolve.' : `\nFAIL: ${fail} problem(s).`);
process.exit(fail === 0 ? 0 : 1);
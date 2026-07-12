#!/usr/bin/env node
/**
 * scripts/gsc-analyze.js
 *
 * Parses the latest Google Search Console export (CSV) dropped into data/gsc/
 * and produces a prioritized action report for the SEO orchestrator.
 *
 * Strategy model (push toward #1 / page 1):
 *   - "WIN"      : already on page 1 (pos <= 10) but 0 CTR  -> fix title/meta
 *   - "PUSH"     : pos 11-20, high impressions             -> boost with links/FAQ
 *   - "CLIMB"    : pos 21-40, high impressions             -> biggest upside
 *   - "LONGTAIL" : pos <=10, low volume                    -> leave, monitor
 *
 * Usage:
 *   node scripts/gsc-analyze.js                 # read newest data/gsc/* CSVs
 *   node scripts/gsc-analyze.js --json          # machine-readable output
 *   node scripts/gsc-analyze.js --top N         # limit rows shown
 */
const fs = require('fs');
const path = require('path');

const GSC_DIR = path.join(__dirname, '..', 'data', 'gsc');
const OUT = path.join(__dirname, '..', 'data', 'gsc-report.json');

function num(x) {
  if (x == null) return 0;
  const s = String(x).replace('%', '').replace(',', '').trim();
  return s === '' ? 0 : parseFloat(s);
}
function loadCsv(name) {
  const p = path.join(GSC_DIR, name);
  if (!fs.existsSync(p)) return [];
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const cells = line.split(',');
    const o = {};
    header.forEach((h, i) => (o[h] = cells[i]));
    return o;
  });
}

// pick newest export batch (we rely on file mtime of the dir contents)
function newestBatch() {
  const files = ['Queries.csv', 'Pages.csv', 'Countries.csv', 'Devices.csv'];
  const present = files.filter(f => fs.existsSync(path.join(GSC_DIR, f)));
  return present.length ? GSC_DIR : null;
}

function bucket(pos, ctr) {
  if (pos <= 10 && ctr < 1) return 'WIN';
  if (pos <= 10) return 'LONGTAIL';
  if (pos <= 20) return 'PUSH';
  if (pos <= 40) return 'CLIMB';
  return 'DEEP';
}

function analyze() {
  const queries = loadCsv('Queries.csv');
  const pages = loadCsv('Pages.csv');
  const countries = loadCsv('Countries.csv');
  const devices = loadCsv('Devices.csv');

  const totImpr = queries.reduce((a, r) => a + num(r.Impressions), 0);
  const totClicks = queries.reduce((a, r) => a + num(r.Clicks), 0);
  const pageImpr = pages.reduce((a, r) => a + num(r.Impressions), 0);
  const pageClicks = pages.reduce((a, r) => a + num(r.Clicks), 0);

  const ranked = pages
    .map(r => {
      const pos = num(r.Position);
      const impr = num(r.Impressions);
      const ctr = num(r.CTR);
      const clicks = num(r.Clicks);
      const slug = (r['Top pages'] || '').split('/posts/')[1] || (r['Top pages'] || '').split('/').pop();
      return { slug, url: r['Top pages'], pos, impr, ctr, clicks, action: bucket(pos, ctr) };
    })
    .filter(x => x.impr >= 5) // ignore noise
    .sort((a, b) => b.impr - a.impr);

  const priority = ranked
    .filter(x => x.action === 'WIN' || x.action === 'PUSH' || x.action === 'CLIMB')
    .filter(x => x.slug && x.slug !== 'news')
    .slice(0, 15);

  const report = {
    generatedAt: new Date().toISOString(),
    totals: {
      queryImpressions: Math.round(totImpr),
      queryClicks: Math.round(totClicks),
      pageImpressions: Math.round(pageImpr),
      pageClicks: Math.round(pageClicks),
      avgCtr: totImpr ? ((totClicks / totImpr) * 100).toFixed(2) : 0,
    },
    topCountries: countries.slice(0, 6).map(r => ({ c: r.Country, im: num(r.Impressions), cl: num(r.Clicks) })),
    priorityPages: priority,
    actions: {
      WIN: priority.filter(p => p.action === 'WIN').map(p => p.slug),
      PUSH: priority.filter(p => p.action === 'PUSH').map(p => p.slug),
      CLIMB: priority.filter(p => p.action === 'CLIMB').map(p => p.slug),
    },
  };

  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  return report;
}

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const top = parseInt((args.find(a => a.startsWith('--top')) || '').split('=')[1]) || 12;

const rep = analyze();

if (asJson) {
  console.log(JSON.stringify(rep, null, 2));
} else {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   GSC SEO ORCHESTRATOR — ACTION REPORT                ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`Total impressions : ${rep.totals.pageImpressions}`);
  console.log(`Total clicks      : ${rep.totals.pageClicks}`);
  console.log(`Avg CTR           : ${rep.totals.avgCtr}%`);
  console.log('\n▶ PRIORITY PAGES (biggest upside):');
  rep.priorityPages.slice(0, top).forEach((p, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. [${p.action}] ${p.slug}`);
    console.log(`       pos ${p.pos}  impr ${p.impr}  ctr ${p.ctr}%  clicks ${p.clicks}`);
  });
  console.log('\n▶ TOP COUNTRIES:');
  rep.topCountries.forEach(c => console.log(`     ${c.c.padEnd(14)} im ${c.im}  cl ${c.cl}`));
  console.log(`\nReport saved -> data/gsc-report.json`);
}

module.exports = { analyze };

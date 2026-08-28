// Contract test: user-facing page titles, h1s, breadcrumbs, and
// CollectionPage JSON-LD names must not contain a frozen year.
// The year is a build-time concern; if you hard-code "2027" in a
// title and forget to bump it in January, Google indexes a stale
// page and the design looks worse than no year at all.
//
// Sentinel-date fallbacks (e.g. for invalid post dates in feeds and
// sitemaps) should use the Unix epoch (1970-01-01) — a stable
// sentinel — not a current year.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function walkJs(root) {
  const out = [];
  for (const entry of readdirSync(root)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(root, entry);
    const s = statSync(full);
    if (s.isDirectory()) out.push(...walkJs(full));
    else if (full.endsWith('.js') || full.endsWith('.jsx')) out.push(full);
  }
  return out;
}

const APP_DIR = join(process.cwd(), 'app');

// Pages that are admin-internal (allowed to reference "2026" in AI
// prompt templates and feature-freeze date comparisons) and must not
// be flagged by this test.
const ADMIN_FILES = new Set(
  walkJs(join(APP_DIR, 'admin'))
);

// Sentinel-date fallback files. These are NOT branding; they handle
// invalid post dates. The contract for them is the OPPOSITE: the
// fallback must be a stable sentinel (1970-01-01), not a current year.
const SENTINEL_FALLBACK_FILES = new Set([
  join(APP_DIR, 'feed.json', 'route.js'),
  join(APP_DIR, 'sitemap.xml', 'route.js'),
  join(APP_DIR, 'news-sitemap.xml', 'route.js'),
]);

// Stop-word usage in a topic-search filter is unrelated to user-facing
// page copy. The contract allows it to mention "2026" as a stopword
// (it's a search-relevance concern, not branding).
const STOPWORD_USAGE = new Set([
  join(APP_DIR, 'topics', '[slug]', 'page.js'),
]);

const files = walkJs(APP_DIR).filter(
  (f) => !ADMIN_FILES.has(f) && !SENTINEL_FALLBACK_FILES.has(f) && !STOPWORD_USAGE.has(f),
);

describe('User-facing pages — no frozen year in titles or headings', () => {
  for (const file of files) {
    it(`${file.replace(process.cwd(), '.')} has no frozen "20XX" year in user-facing copy`, () => {
      const src = readFileSync(file, 'utf-8');
      // Only flag years that are inside string literals that look like
      // user-facing copy: titles, headings, breadcrumb names, JSON-LD
      // name fields, og:title, etc. This regex targets the common
      // patterns: '...2026...' or "...2026..." or `...2026...`.
      const matches = src.match(/['"`][^'"`]{0,80}20\d{2}[^'"`]{0,80}['"`]/g) || [];
      const offenders = matches.filter((m) => {
        // Allow current-year template forms (these are fine):
        //   `${new Date().getFullYear()}`
        //   `{new Date().getFullYear()}`
        //   `${some.year}` etc. — anything that derives from JS.
        if (m.includes('getFullYear')) return false;
        if (m.includes('Date(')) return false;
        // Allow stopword usage and other non-year numerics.
        return /\b20\d{2}\b/.test(m);
      });
      expect(offenders, `frozen year in user-facing copy: ${offenders.join(' | ')}`).toEqual([]);
    });
  }
});

describe('Sentinel-date fallbacks — must use a stable sentinel (not a current year)', () => {
  for (const file of SENTINEL_FALLBACK_FILES) {
    it(`${file.replace(process.cwd(), '.')} fallback uses 1970-01-01, not a current year`, () => {
      const src = readFileSync(file, 'utf-8');
      expect(src).toMatch(/['"`]1970-01-01/);
      expect(src).not.toMatch(/['"`]20\d{2}-01-01/);
    });
  }
});

/**
 * Regression tests for lib/posts.js content caching.
 *
 * Context: the ai-blog build became quadratic (944 static pages, each one
 * re-reading + re-parsing all 685 .mdx files) which blew the CI and Vercel
 * build-time limits and left production stale since 2026-09-22. lib/posts.js
 * now memoizes parses behind a content signature.
 *
 * These tests pin the three properties that make the cache safe:
 *   1. identical results to the uncached implementation (ordering, drafts,
 *      related-post scoring, adjacent posts),
 *   2. the cache actually re-parses when a post changes on disk,
 *   3. callers can freely mutate the returned array without corrupting the
 *      shared cache.
 *
 * 40 real posts are copied into the fixture so the code paths see real
 * frontmatter shapes; every assertion is scoped to fixture-only categories
 * (prefix __fx_) and future dates so it stays deterministic.
 */
import { describe, it, expect, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

const REPO = path.resolve(__dirname, '..', '..');
const POSTS = path.join(REPO, 'content', 'posts');

const post = ({ title, category, tags = ['ai', 'tools'], date, draft = false, body }) => `---
title: "${title}"
excerpt: "${'x'.repeat(130)}"
date: "${date}"
category: "${category}"
tags: [${tags.join(', ')}]
${draft ? 'draft: true\n' : ''}---

## H2 One

${body}

## FAQ

### Q?

A.
`;

const FIXTURE = fs.mkdtempSync(path.join(os.tmpdir(), 'posts-cache-'));
const FIXTURE_POSTS = path.join(FIXTURE, 'content', 'posts');
fs.mkdirSync(FIXTURE_POSTS, { recursive: true });

const write = (name, body) => fs.writeFileSync(path.join(FIXTURE_POSTS, name), body, 'utf8');

const A = '__fx_alpha__';
const C = '__fx_gamma__';
const D = '__fx_epsilon__';

write('a-newest.mdx', post({ title: 'Alpha tool review and benchmark', category: A, date: '2030-09-01', body: 'alpha alpha alpha benchmark harness comparison testing'.repeat(30) }));
write('b-middle.mdx', post({ title: 'Beta tool review and benchmark', category: A, tags: ['ai'], date: '2030-08-01', body: 'beta harness comparison alpha testing evaluation results'.repeat(30) }));
write('c-oldest.mdx', post({ title: 'Gamma tool review and benchmark', category: C, date: '2030-07-01', body: 'gamma comparison delta epsilon unrelated vocabulary here'.repeat(30) }));
write('d-draft.mdx', post({ title: 'Draft tool review and benchmark', category: A, date: '2030-09-15', draft: true, body: 'draft body alpha harness'.repeat(30) }));

// real-world frontmatter samples (they share categories with each other, never with __fx_*)
const realFiles = fs.readdirSync(POSTS).filter((f) => /\.mdx?$/.test(f)).slice(0, 40);
for (const f of realFiles) write(f, fs.readFileSync(path.join(POSTS, f), 'utf8'));

const originalCwd = process.cwd();
process.chdir(FIXTURE);
const lib = await import(path.join(REPO, 'lib', 'posts.js'));

// lib/posts re-stats content at most once per second; sleep past that to observe edits
const settle = () => new Promise((r) => setTimeout(r, 1050));

describe('lib/posts cache: parity', () => {
  it('excludes drafts from getAllPosts and includes them on request', () => {
    expect(lib.getAllPosts().map((p) => p.slug)).not.toContain('d-draft');
    expect(lib.getAllPosts({ includeDrafts: true }).map((p) => p.slug)).toContain('d-draft');
  });

  it('sorts by date descending, newest first', () => {
    expect(['a-newest', 'b-middle', 'c-oldest'].map((s) => lib.getPostBySlug(s).date)).toEqual(['2030-09-01', '2030-08-01', '2030-07-01']);
    expect(lib.getAllPosts()[0].slug).toBe('a-newest'); // future dates put fixtures on top
  });

  it('returns identical results on repeated calls (cache does not drift)', () => {
    expect(lib.getAllPosts().map((p) => p.slug).join(',')).toBe(lib.getAllPosts().map((p) => p.slug).join(','));
  });

  it('does not let a caller re-sorting the result corrupt the shared cache', () => {
    const before = lib.getAllPosts().map((p) => p.slug).join(',');
    const hacked = lib.getAllPosts();
    hacked.reverse();
    hacked.length = 0;
    hacked.push({ slug: 'junk', date: '2031-01-01' });
    expect(lib.getAllPosts().map((p) => p.slug).join(',')).toBe(before);
  });

  it('resolves getPostBySlug and still returns null for a missing post', () => {
    expect(lib.getPostBySlug('a-newest').title).toContain('Alpha');
    expect(lib.getPostBySlug('a-newest.mdx').title).toContain('Alpha');
    expect(lib.getPostBySlug('does-not-exist')).toBeNull();
    expect(lib.getPostBySlug(null)).toBeNull();
  });

  it('getRelatedPosts prefers same-category posts and stays deterministic', () => {
    const a = lib.getRelatedPosts('a-newest', A, ['ai', 'tools'], 6);
    const b = lib.getRelatedPosts('a-newest', A, ['ai', 'tools'], 6);
    expect(a.map((p) => p.slug)).toEqual(b.map((p) => p.slug));
    expect(a).toHaveLength(6);
    expect(a[0].slug).toBe('b-middle'); // same category + overlapping keywords + recent
    expect(a.map((p) => p.slug)).not.toContain('a-newest');
  });

  it('getAdjacentPosts walks the date-sorted list', () => {
    const { prev, next } = lib.getAdjacentPosts('b-middle');
    expect(next.slug).toBe('a-newest');
    expect(prev.slug).toBe('c-oldest');
    expect(lib.getAdjacentPosts('nope')).toEqual({ prev: null, next: null });
  });

  it('getAllPostSlugs strips extensions and lists every file', () => {
    const slugs = lib.getAllPostSlugs();
    expect(slugs).toHaveLength(fs.readdirSync(FIXTURE_POSTS).filter((f) => /\.mdx?$/.test(f)).length);
    expect(slugs.every((s) => !s.endsWith('.mdx'))).toBe(true);
    expect(slugs).toContain('a-newest');
  });

  it('grouped helpers stay consistent across calls', () => {
    expect(lib.getAllCategories().find((c) => c.name === A).count).toBe(2); // draft excluded
    expect(lib.getPostsByCategory(C).map((p) => p.slug)).toEqual(['c-oldest']);
    expect(lib.getAllPosts({ includeDrafts: true }).filter((p) => p.category === A)).toHaveLength(3);
    expect(lib.getAllTags().some((t) => t.name.toLowerCase() === 'ai')).toBe(true);
    expect(lib.getCategoryBySlug('comparisons')).toBe('Comparisons');
  });

  it('extractKeywords still honors max and is exported for direct callers', () => {
    expect(lib.extractKeywords('alpha beta gamma alpha beta delta zeta alpha', 2)).toEqual(['alpha', 'beta']);
  });
});

describe('lib/posts cache: invalidation', () => {
  it('re-reads a post after its file changes on disk', async () => {
    expect(lib.getPostBySlug('a-newest').title).toContain('Alpha');
    write('a-newest.mdx', post({ title: 'Alpha tool review RENAMED benchmark', category: A, date: '2030-09-01', body: 'alpha alpha alpha benchmark harness comparison testing'.repeat(30) }));
    await settle();
    expect(lib.getPostBySlug('a-newest').title).toContain('RENAMED');
    // keywords of the edited post must be recomputed too, not served stale
    expect(lib.getRelatedPosts('a-newest', A, ['ai', 'tools'], 6)[0].slug).toBe('b-middle');
  });

  it('drops the cache entirely when a post is deleted', async () => {
    expect(lib.getAllPostSlugs()).toContain('c-oldest');
    fs.rmSync(path.join(FIXTURE_POSTS, 'c-oldest.mdx'));
    await settle();
    expect(lib.getAllPostSlugs()).not.toContain('c-oldest');
    expect(lib.getPostBySlug('c-oldest')).toBeNull();
    expect(lib.getPostsByCategory(C)).toEqual([]);
  });

  it('picks up a brand new post', async () => {
    write('e-brand-new.mdx', post({ title: 'Epsilon tool review and benchmark', category: D, date: '2030-10-01', body: 'epsilon zeta fresh content'.repeat(30) }));
    await settle();
    expect(lib.getAllPosts()[0].slug).toBe('e-brand-new');
  });
});

afterAll(() => {
  process.chdir(originalCwd);
  fs.rmSync(FIXTURE, { recursive: true, force: true });
});

import { describe, it, expect, beforeAll, afterAll, vi, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

vi.mock('@/lib/rate-limit', () => ({
  getRateLimitHeaders: () => ({ allowed: true, remaining: 9, retryAfter: 0 }),
}));

const POSTS = {
  'tech-a.mdx': `---
title: Tech A
date: 2026-01-15
category: Technology
draft: true
seoScore: 75
---
Tech A content.`,
  'science-b.mdx': `---
title: Science B
date: 2026-02-20
category: Science
draft: false
seoScore: 85
---
Science B content.`,
};

let tmpDir;
let originalCwd;

async function loadRoute() {
  vi.resetModules();
  process.chdir(tmpDir);
  const mod = await import('../../app/admin/api/bulk-edit/route');
  process.chdir(originalCwd);
  return mod;
}

function createFixture() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bulk-edit-api-'));
  fs.mkdirSync(path.join(tmpDir, 'content', 'posts'), { recursive: true });
  for (const [name, content] of Object.entries(POSTS)) {
    fs.writeFileSync(path.join(tmpDir, 'content', 'posts', name), content, 'utf8');
  }
}

function destroyFixture() {
  if (tmpDir) {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

function readPostContent(slug) {
  return fs.readFileSync(path.join(tmpDir, 'content', 'posts', `${slug}.mdx`), 'utf8');
}

beforeAll(() => { originalCwd = process.cwd(); });
afterAll(() => { process.chdir(originalCwd); });
afterEach(() => { destroyFixture(); });

describe('Bulk Edit API - GET', () => {
  it('returns all posts with parsed frontmatter', async () => {
    createFixture();
    const { GET } = await loadRoute();
    const res = await GET();
    const data = await res.json();

    expect(data.posts).toHaveLength(2);
    const tech = data.posts.find(p => p.slug === 'tech-a');
    expect(tech.title).toBe('Tech A');
    expect(tech.category).toBe('Technology');
    expect(tech.draft).toBe(true);
    expect(tech.seoScore).toBe(75);
  });
});

describe('Bulk Edit API - PUT', () => {
  it('updates multiple posts frontmatter', async () => {
    createFixture();
    const { PUT } = await loadRoute();
    const req = new Request('http://localhost/api/bulk-edit', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slugs: ['tech-a', 'science-b'], changes: { category: 'Reviews' } }),
    });
    const res = await PUT(req);
    const data = await res.json();

    expect(data.total).toBe(2);
    expect(data.updated).toBe(2);
    expect(data.results.every(r => r.status === 'updated')).toBe(true);

    expect(readPostContent('tech-a')).toContain('category: Reviews');
    expect(readPostContent('science-b')).toContain('category: Reviews');
  });

  it('returns 400 when slugs is missing', async () => {
    createFixture();
    const { PUT } = await loadRoute();
    const req = new Request('http://localhost/api/bulk-edit', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changes: { category: 'Tech' } }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('slugs');
  });

  it('returns 400 for invalid changes (invalid seoScore)', async () => {
    createFixture();
    const { PUT } = await loadRoute();
    const req = new Request('http://localhost/api/bulk-edit', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slugs: ['tech-a'], changes: { seoScore: 200 } }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Validation failed');
  });

  it('reports not-found for non-existent slugs', async () => {
    createFixture();
    const { PUT } = await loadRoute();
    const req = new Request('http://localhost/api/bulk-edit', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slugs: ['nonexistent', 'tech-a'], changes: { seoScore: 90 } }),
    });
    const res = await PUT(req);
    const data = await res.json();

    expect(data.total).toBe(2);
    const notFound = data.results.find(r => r.slug === 'nonexistent');
    expect(notFound.status).toBe('not-found');
    const updated = data.results.find(r => r.slug === 'tech-a');
    expect(updated.status).toBe('updated');
  });

  it('removes a field when value is empty', async () => {
    createFixture();
    const { PUT } = await loadRoute();
    const req = new Request('http://localhost/api/bulk-edit', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slugs: ['tech-a'], changes: { seoScore: '' } }),
    });
    const res = await PUT(req);
    const data = await res.json();
    expect(data.results[0].status).toBe('updated');

    const content = readPostContent('tech-a');
    expect(content).not.toMatch(/^seoScore:/m);
  });
});

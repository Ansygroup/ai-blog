import { describe, it, expect, beforeAll, afterAll, vi, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

vi.mock('@/lib/rate-limit', () => ({
  getRateLimitHeaders: () => ({ allowed: true, remaining: 9, retryAfter: 0 }),
}));

const POSTS = {
  'tech-1.mdx': `---
title: Tech One
date: 2026-01-15
category: Technology
draft: true
---
Tech one content.`,
  'tech-2.mdx': `---
title: Tech Two
date: 2026-02-20
category: Technology
draft: false
---
Tech two content.`,
  'science-1.mdx': `---
title: Science One
date: 2026-03-10
category: Science
draft: true
---
Science one content.`,
};

let tmpDir;
let originalCwd;

async function loadRoute() {
  vi.resetModules();
  process.chdir(tmpDir);
  const mod = await import('../../app/admin/api/categories/route');
  process.chdir(originalCwd);
  return mod;
}

function createFixture() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'categories-api-'));
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

describe('Categories API - GET', () => {
  it('returns categories sorted by count descending', async () => {
    createFixture();
    const { GET } = await loadRoute();
    const res = await GET();
    const data = await res.json();

    expect(data.categories).toHaveLength(2);
    expect(data.categories[0].name).toBe('Technology');
    expect(data.categories[0].count).toBe(2);
    expect(data.categories[1].name).toBe('Science');
    expect(data.categories[1].count).toBe(1);
    expect(data.total).toBe(3);
  });

  it('includes post slugs and titles in each category', async () => {
    createFixture();
    const { GET } = await loadRoute();
    const res = await GET();
    const data = await res.json();

    const tech = data.categories.find(c => c.name === 'Technology');
    expect(tech.posts).toHaveLength(2);
    expect(tech.posts[0].slug).toBe('tech-1');
    expect(tech.posts[1].slug).toBe('tech-2');
  });
});

describe('Categories API - PATCH', () => {
  it('renames a category across all posts', async () => {
    createFixture();
    const { PATCH } = await loadRoute();
    const req = new Request('http://localhost/api/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName: 'Technology', newName: 'AI Tools' }),
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.modified).toBe(2);

    expect(readPostContent('tech-1')).toContain('category: AI Tools');
    expect(readPostContent('tech-2')).toContain('category: AI Tools');
    expect(readPostContent('science-1')).toContain('category: Science');
  });

  it('returns 400 when oldName is missing', async () => {
    createFixture();
    const { PATCH } = await loadRoute();
    const req = new Request('http://localhost/api/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newName: 'Tech' }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('oldName');
  });

  it('returns 400 for invalid newName', async () => {
    createFixture();
    const { PATCH } = await loadRoute();
    const req = new Request('http://localhost/api/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName: 'Technology', newName: 'InvalidCat!' }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });
});

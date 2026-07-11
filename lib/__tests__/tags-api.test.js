import { describe, it, expect, beforeAll, afterAll, vi, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const POSTS = {
  'ai-tools.mdx': `---
title: AI Tools Post
date: 2026-01-15
category: Reviews
tags: ['AI Tools', 'productivity', 'ChatGPT']
---
AI tools content.`,
  'chatbots.mdx': `---
title: Chatbots Post
date: 2026-02-20
category: Reviews
tags: ['AI Tools', 'chatbots']
---
Chatbots content.`,
  'untagged.mdx': `---
title: Untagged Post
date: 2026-03-10
category: Tutorials
---
Untagged content.`,
};

const CANONICAL_TAGS_SOURCE = `const CANONICAL_TAGS = new Set([
  'AI Tools',
  'productivity',
  'chatbots',
  'ChatGPT',
  'tutorials',
]);
`;

let tmpDir;
let originalCwd;

async function loadRoute() {
  vi.resetModules();
  process.chdir(tmpDir);
  const mod = await import('../../app/admin/api/tags/route');
  process.chdir(originalCwd);
  return mod;
}

function createFixture(opts = {}) {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tags-api-'));
  fs.mkdirSync(path.join(tmpDir, 'content', 'posts'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'scripts'), { recursive: true });
  for (const [name, content] of Object.entries(POSTS)) {
    fs.writeFileSync(path.join(tmpDir, 'content', 'posts', name), content, 'utf8');
  }
  if (opts.canonicalTags !== false) {
    fs.writeFileSync(path.join(tmpDir, 'scripts', 'normalize-tags.js'), opts.canonicalTags || CANONICAL_TAGS_SOURCE, 'utf8');
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

describe('Tags API - GET', () => {
  it('returns all tags sorted alphabetically with counts', async () => {
    createFixture();
    const { GET } = await loadRoute();
    const res = await GET();
    const data = await res.json();

    expect(data.totalTags).toBe(4);
    expect(data.totalPosts).toBe(3);
    expect(data.tags).toHaveLength(4);

    const tagNames = data.tags.map(t => t.tag);
    expect(tagNames).toEqual(['AI Tools', 'chatbots', 'ChatGPT', 'productivity']);
  });

  it('lists posts under each tag', async () => {
    createFixture();
    const { GET } = await loadRoute();
    const res = await GET();
    const data = await res.json();

    const aiTools = data.tags.find(t => t.tag === 'AI Tools');
    expect(aiTools.count).toBe(2);
    expect(aiTools.posts).toHaveLength(2);
    const slugs = aiTools.posts.map(p => p.slug).sort();
    expect(slugs).toEqual(['ai-tools', 'chatbots']);
  });

  it('lists untagged posts separately', async () => {
    createFixture();
    const { GET } = await loadRoute();
    const res = await GET();
    const data = await res.json();

    expect(data.untagged).toBe(1);
  });

  it('returns empty canonical tags list when source file missing', async () => {
    createFixture({ canonicalTags: false });
    const { GET } = await loadRoute();
    const res = await GET();
    const data = await res.json();

    expect(data.canonicalTags).toEqual([]);
  });
});

describe('Tags API - POST merge', () => {
  it('merges one tag into another across all posts', async () => {
    createFixture();
    const { POST } = await loadRoute();
    const req = new Request('http://localhost/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'merge', fromTag: 'chatbots', toTag: 'AI Chatbots' }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.modified).toBe(1);

    const content = readPostContent('chatbots');
    expect(content).toContain('AI Chatbots');
    expect(content).not.toContain("'chatbots'");
  });

  it('deduplicates tags when merge creates duplicates', async () => {
    createFixture();
    const { POST } = await loadRoute();
    const req = new Request('http://localhost/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'merge', fromTag: 'AI Tools', toTag: 'productivity' }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.modified).toBe(2);

    const content = readPostContent('ai-tools');
    expect(content).toContain("'productivity'");
    expect(content).not.toMatch(/'AI Tools'/);
  });

  it('returns 400 when fromTag or toTag is missing', async () => {
    createFixture();
    const { POST } = await loadRoute();
    const req = new Request('http://localhost/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'merge', fromTag: 'chatbots' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('Tags API - POST delete', () => {
  it('removes a tag from all posts', async () => {
    createFixture();
    const { POST } = await loadRoute();
    const req = new Request('http://localhost/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', fromTag: 'productivity' }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.modified).toBe(1);

    const content = readPostContent('ai-tools');
    expect(content).not.toContain('productivity');
    expect(content).toContain('AI Tools');
  });

  it('returns 400 when fromTag missing for delete', async () => {
    createFixture();
    const { POST } = await loadRoute();
    const req = new Request('http://localhost/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('Tags API - POST error handling', () => {
  it('returns 400 for unknown action', async () => {
    createFixture();
    const { POST } = await loadRoute();
    const req = new Request('http://localhost/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unknown' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Unknown action');
  });
});

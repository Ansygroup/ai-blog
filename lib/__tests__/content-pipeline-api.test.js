import { describe, it, expect, beforeAll, afterAll, vi, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

vi.mock('@/lib/rate-limit', () => ({
  getRateLimitHeaders: () => ({ allowed: true, remaining: 9, retryAfter: 0 }),
}));
vi.mock('@/lib/activity-log', () => ({
  logAction: vi.fn(),
}));

const POSTS = {
  'post-draft.mdx': `---
title: Draft Post
date: 2026-01-15
category: Technology
draft: true
seoScore: 70
---
Draft content.`,
  'post-published.mdx': `---
title: Published Post
date: 2026-02-20
category: Science
draft: false
seoScore: 85
---
Published content.`,
  'post-scheduled.mdx': `---
title: Scheduled Post
date: 2026-03-10
category: Technology
draft: true
seoScore: 65
---
Scheduled draft.`,
};

let tmpDir;
let originalCwd;

async function loadRoute() {
  vi.resetModules();
  process.chdir(tmpDir);
  const mod = await import('../../app/admin/api/content-pipeline/route');
  process.chdir(originalCwd);
  return mod;
}

function createFixture(opts = {}) {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-api-'));
  fs.mkdirSync(path.join(tmpDir, 'content', 'posts'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'public', 'data'), { recursive: true });
  for (const [name, content] of Object.entries(POSTS)) {
    fs.writeFileSync(path.join(tmpDir, 'content', 'posts', name), content, 'utf8');
  }
  if (opts.ideas) {
    fs.writeFileSync(path.join(tmpDir, 'public', 'data', 'ideas.json'), JSON.stringify(opts.ideas, null, 2), 'utf8');
  }
  if (opts.schedule) {
    fs.writeFileSync(path.join(tmpDir, 'public', 'data', 'schedule.json'), JSON.stringify(opts.schedule, null, 2), 'utf8');
  }
}

function destroyFixture() {
  if (tmpDir) {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

function readIdeas() {
  const p = path.join(tmpDir, 'public', 'data', 'ideas.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : [];
}

beforeAll(() => { originalCwd = process.cwd(); });
afterAll(() => { process.chdir(originalCwd); });
afterEach(() => { destroyFixture(); });

describe('Content Pipeline API - GET', () => {
  it('returns pipeline with all 4 columns', async () => {
    createFixture();
    const { GET } = await loadRoute();
    const res = await GET();
    const data = await res.json();

    expect(data.pipeline).toBeDefined();
    expect(data.pipeline.ideas).toBeDefined();
    expect(data.pipeline.drafts).toBeDefined();
    expect(data.pipeline.scheduled).toBeDefined();
    expect(data.pipeline.published).toBeDefined();
  });

  it('categorizes posts as draft, scheduled, or published', async () => {
    createFixture({
      schedule: [{ slug: 'post-scheduled', date: '2026-07-01', createdAt: '2026-06-01T00:00:00.000Z' }],
    });
    const { GET } = await loadRoute();
    const res = await GET();
    const data = await res.json();

    expect(data.pipeline.drafts).toHaveLength(1);
    expect(data.pipeline.drafts[0].slug).toBe('post-draft');

    expect(data.pipeline.scheduled).toHaveLength(1);
    expect(data.pipeline.scheduled[0].slug).toBe('post-scheduled');
    expect(data.pipeline.scheduled[0].scheduledDate).toBe('2026-07-01');

    expect(data.pipeline.published).toHaveLength(1);
    expect(data.pipeline.published[0].slug).toBe('post-published');
  });

  it('returns counts object with correct totals', async () => {
    createFixture({
      ideas: [{ id: 1, title: 'New idea', note: '', createdAt: '2026-01-01T00:00:00.000Z' }],
    });
    const { GET } = await loadRoute();
    const res = await GET();
    const data = await res.json();

    expect(data.counts.ideas).toBe(1);
    expect(data.counts.drafts).toBe(2);
    expect(data.counts.scheduled).toBe(0);
    expect(data.counts.published).toBe(1);
  });

  it('sorts published by date descending', async () => {
    createFixture();
    const { GET } = await loadRoute();
    const res = await GET();
    const data = await res.json();

    expect(data.pipeline.published[0].slug).toBe('post-published');
  });

  it('handles missing ideas.json gracefully', async () => {
    createFixture();
    const { GET } = await loadRoute();
    const res = await GET();
    const data = await res.json();

    expect(data.pipeline.ideas).toEqual([]);
  });
});

describe('Content Pipeline API - POST add-idea', () => {
  it('adds a new idea to ideas.json', async () => {
    createFixture();
    const { POST } = await loadRoute();
    const req = new Request('http://localhost/api/content-pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add-idea', title: 'New idea', note: 'Some note' }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.ideas).toHaveLength(1);
    expect(data.ideas[0].title).toBe('New idea');
    expect(data.ideas[0].note).toBe('Some note');

    const ideas = readIdeas();
    expect(ideas).toHaveLength(1);
    expect(ideas[0].id).toBeDefined();
  });

  it('appends to existing ideas.json', async () => {
    createFixture({
      ideas: [{ id: 1, title: 'Existing', note: '', createdAt: '2026-01-01T00:00:00.000Z' }],
    });
    const { POST } = await loadRoute();
    const req = new Request('http://localhost/api/content-pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add-idea', title: 'Second idea' }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(data.ideas).toHaveLength(2);
    expect(data.ideas[0].title).toBe('Existing');
    expect(data.ideas[1].title).toBe('Second idea');
  });

  it('returns 400 if title is missing', async () => {
    createFixture();
    const { POST } = await loadRoute();
    const req = new Request('http://localhost/api/content-pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add-idea' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('Content Pipeline API - POST delete-idea', () => {
  it('removes an idea by title', async () => {
    createFixture({
      ideas: [
        { id: 1, title: 'Keep this', note: '', createdAt: '2026-01-01T00:00:00.000Z' },
        { id: 2, title: 'Delete this', note: '', createdAt: '2026-01-02T00:00:00.000Z' },
      ],
    });
    const { POST } = await loadRoute();
    const req = new Request('http://localhost/api/content-pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-idea', title: 'Delete this' }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.ideas).toHaveLength(1);
    expect(data.ideas[0].title).toBe('Keep this');
  });

  it('returns 400 if title missing for delete', async () => {
    createFixture();
    const { POST } = await loadRoute();
    const req = new Request('http://localhost/api/content-pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-idea' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('Content Pipeline API - POST error handling', () => {
  it('returns 400 for unknown action', async () => {
    createFixture();
    const { POST } = await loadRoute();
    const req = new Request('http://localhost/api/content-pipeline', {
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

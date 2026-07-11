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
  'post-tech.mdx': `---
title: Tech Post
date: 2026-01-15
category: Technology
draft: true
seoScore: 75
tags: tech
---
Tech content here.`,
  'post-science.mdx': `---
title: Science Post
date: 2026-02-20
category: Science
draft: false
seoScore: 85
tags: science
---
Science content here.`,
  'post-draft.mdx': `---
title: Draft Only
date: 2026-03-01
category: Technology
draft: true
seoScore: 55
tags: draft
---
Draft content.`,
};

let tmpDir;
let originalCwd;

async function loadRoute() {
  vi.resetModules();
  process.chdir(tmpDir);
  const mod = await import('../../app/admin/api/schedule/route');
  process.chdir(originalCwd);
  return mod;
}

function createFixture(scheduleEntries) {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'schedule-api-'));
  fs.mkdirSync(path.join(tmpDir, 'content', 'posts'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'public', 'data'), { recursive: true });
  for (const [name, content] of Object.entries(POSTS)) {
    fs.writeFileSync(path.join(tmpDir, 'content', 'posts', name), content, 'utf8');
  }
  if (scheduleEntries) {
    fs.writeFileSync(
      path.join(tmpDir, 'public', 'data', 'schedule.json'),
      JSON.stringify(scheduleEntries, null, 2),
      'utf8'
    );
  }
}

function destroyFixture() {
  if (tmpDir) {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

function readPostContent(slug) {
  return fs.readFileSync(path.join(tmpDir, 'content', 'posts', `${slug}.mdx`), 'utf8');
}

function readScheduleFile() {
  const sp = path.join(tmpDir, 'public', 'data', 'schedule.json');
  return fs.existsSync(sp) ? JSON.parse(fs.readFileSync(sp, 'utf8')) : [];
}

beforeAll(() => {
  originalCwd = process.cwd();
});

afterAll(() => {
  process.chdir(originalCwd);
});

afterEach(() => {
  destroyFixture();
});

describe('Schedule API - GET', () => {
  it('returns all posts with draft/scheduled counts when schedule.json missing', async () => {
    createFixture();
    const { GET } = await loadRoute();
    const res = await GET();
    const data = await res.json();

    expect(data.posts).toHaveLength(3);
    expect(data.scheduledPosts).toHaveLength(0);
    expect(data.draftPosts).toHaveLength(2);
    expect(data.total).toBe(3);
  });

  it('includes scheduled dates from schedule.json', async () => {
    createFixture([{ slug: 'post-tech', date: '2026-06-01', createdAt: '2026-05-01T00:00:00.000Z' }]);
    const { GET } = await loadRoute();
    const res = await GET();
    const data = await res.json();

    expect(data.scheduledPosts).toHaveLength(1);
    expect(data.scheduledPosts[0].slug).toBe('post-tech');
    expect(data.scheduledPosts[0].scheduledDate).toBe('2026-06-01');
  });

  it('parses frontmatter correctly', async () => {
    createFixture();
    const { GET } = await loadRoute();
    const res = await GET();
    const data = await res.json();

    const tech = data.posts.find(p => p.slug === 'post-tech');
    expect(tech.title).toBe('Tech Post');
    expect(tech.category).toBe('Technology');
    expect(tech.draft).toBe(true);
    expect(tech.seoScore).toBe(75);

    const sci = data.posts.find(p => p.slug === 'post-science');
    expect(sci.draft).toBe(false);
    expect(sci.seoScore).toBe(85);
  });
});

describe('Schedule API - POST schedule', () => {
  it('schedules a post with slug and date', async () => {
    createFixture();
    const { POST } = await loadRoute();
    const req = new Request('http://localhost/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'post-tech', scheduledDate: '2026-07-01', action: 'schedule' }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.entry.slug).toBe('post-tech');
    expect(data.entry.date).toBe('2026-07-01');

    const schedule = readScheduleFile();
    expect(schedule).toHaveLength(1);
    expect(schedule[0].slug).toBe('post-tech');
  });

  it('returns 400 if slug or scheduledDate missing', async () => {
    createFixture();
    const { POST } = await loadRoute();
    const req = new Request('http://localhost/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'schedule', slug: 'post-tech' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('scheduledDate');
  });

  it('reschedules an existing entry', async () => {
    createFixture([{ slug: 'post-tech', date: '2026-06-01', createdAt: '2026-05-01T00:00:00.000Z' }]);
    const { POST } = await loadRoute();
    const req = new Request('http://localhost/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'post-tech', scheduledDate: '2026-08-01', action: 'schedule' }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(data.success).toBe(true);

    const schedule = readScheduleFile();
    expect(schedule).toHaveLength(1);
    expect(schedule[0].date).toBe('2026-08-01');
  });
});

describe('Schedule API - POST unschedule', () => {
  it('removes a scheduled entry', async () => {
    createFixture([
      { slug: 'post-tech', date: '2026-06-01', createdAt: '2026-05-01T00:00:00.000Z' },
      { slug: 'post-science', date: '2026-06-15', createdAt: '2026-05-01T00:00:00.000Z' },
    ]);
    const { POST } = await loadRoute();
    const req = new Request('http://localhost/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'post-tech', action: 'unschedule' }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(data.success).toBe(true);

    const schedule = readScheduleFile();
    expect(schedule).toHaveLength(1);
    expect(schedule[0].slug).toBe('post-science');
  });

  it('returns 400 if slug missing for unschedule', async () => {
    createFixture();
    const { POST } = await loadRoute();
    const req = new Request('http://localhost/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unschedule' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('Schedule API - POST publish', () => {
  it('publishes a draft post by setting draft: false', async () => {
    createFixture();
    const { POST } = await loadRoute();
    const req = new Request('http://localhost/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'post-tech', action: 'publish' }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.message).toContain('post-tech');

    const content = readPostContent('post-tech');
    expect(content).not.toContain('draft: true');
    expect(content).toContain('draft: false');
  });

  it('returns 404 for non-existent post', async () => {
    createFixture();
    const { POST } = await loadRoute();
    const req = new Request('http://localhost/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'nonexistent', action: 'publish' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});

describe('Schedule API - POST batch-schedule', () => {
  it('schedules multiple entries at once', async () => {
    createFixture();
    const { POST } = await loadRoute();
    const req = new Request('http://localhost/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'batch-schedule',
        entries: [
          { slug: 'post-tech', date: '2026-07-01' },
          { slug: 'post-science', date: '2026-07-05' },
        ],
      }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.count).toBe(2);

    const schedule = readScheduleFile();
    expect(schedule).toHaveLength(2);
  });

  it('returns 400 if entries is missing', async () => {
    createFixture();
    const { POST } = await loadRoute();
    const req = new Request('http://localhost/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'batch-schedule' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('Schedule API - POST error handling', () => {
  it('returns 400 for unknown action', async () => {
    createFixture();
    const { POST } = await loadRoute();
    const req = new Request('http://localhost/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unknown', slug: 'post-tech' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Unknown action');
  });
});

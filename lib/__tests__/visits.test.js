import { describe, it, expect, beforeAll, afterAll, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

let tmpDir;
let originalCwd;

beforeAll(() => {
  originalCwd = process.cwd();
});

afterAll(() => {
  process.chdir(originalCwd);
});

afterEach(() => {
  if (tmpDir) {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
});

function setupCwd() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'visits-lib-'));
  process.chdir(tmpDir);
}

function mkReq({ ip, ua, referer } = {}) {
  const headers = new Map();
  if (ip) headers.set('x-forwarded-for', ip);
  if (ua) headers.set('user-agent', ua);
  if (referer) headers.set('referer', referer);
  return { headers: { get: (k) => headers.get(k.toLowerCase()) || null } };
}

async function loadModule() {
  vi.resetModules();
  return await import('../../lib/visits');
}

describe('visits - trackVisit', () => {
  beforeEach(() => { setupCwd(); });

  it('tracks a public page view', async () => {
    const { trackVisit, getVisitStats } = await loadModule();
    const result = trackVisit({ pathname: '/posts/hello', ua: 'Mozilla/5.0', req: mkReq({ ip: '1.2.3.4' }) });

    expect(result.tracked).toBe(true);
    expect(result.unique).toBe(true);

    const stats = getVisitStats();
    expect(stats.total).toBe(1);
    expect(stats.today).toBe(1);
    expect(stats.topPages[0].path).toBe('/posts/hello');
    expect(stats.topPages[0].total).toBe(1);
  });

  it('skips /admin paths', async () => {
    const { trackVisit, getVisitStats } = await loadModule();
    const r1 = trackVisit({ pathname: '/admin/dashboard', ua: 'Mozilla/5.0' });
    const r2 = trackVisit({ pathname: '/admin/api/visits', ua: 'Mozilla/5.0' });
    const r3 = trackVisit({ pathname: '/api/track', ua: 'Mozilla/5.0' });

    expect(r1.tracked).toBe(false);
    expect(r2.tracked).toBe(false);
    expect(r3.tracked).toBe(false);
    expect(getVisitStats().total).toBe(0);
  });

  it('skips static assets', async () => {
    const { trackVisit, getVisitStats } = await loadModule();
    trackVisit({ pathname: '/favicon.ico', ua: 'Mozilla/5.0' });
    trackVisit({ pathname: '/styles.css', ua: 'Mozilla/5.0' });
    trackVisit({ pathname: '/_next/static.js', ua: 'Mozilla/5.0' });
    trackVisit({ pathname: '/robots.txt', ua: 'Mozilla/5.0' });
    trackVisit({ pathname: '/sitemap.xml', ua: 'Mozilla/5.0' });
    expect(getVisitStats().total).toBe(0);
  });

  it('skips bot user agents', async () => {
    const { trackVisit, getVisitStats } = await loadModule();
    trackVisit({ pathname: '/posts/x', ua: 'Googlebot/2.1' });
    trackVisit({ pathname: '/posts/x', ua: 'Mozilla/5.0 (compatible; bingbot/2.0)' });
    trackVisit({ pathname: '/posts/x', ua: 'Mozilla/5.0 (compatible; AhrefsBot/7.0)' });
    expect(getVisitStats().total).toBe(0);
  });

  it('deduplicates same IP+path within session window', async () => {
    const { trackVisit, getVisitStats } = await loadModule();
    trackVisit({ pathname: '/posts/hello', ua: 'Mozilla/5.0', req: mkReq({ ip: '1.1.1.1' }) });
    trackVisit({ pathname: '/posts/hello', ua: 'Mozilla/5.0', req: mkReq({ ip: '1.1.1.1' }) });
    trackVisit({ pathname: '/posts/hello', ua: 'Mozilla/5.0', req: mkReq({ ip: '1.1.1.1' }) });

    const stats = getVisitStats();
    expect(stats.total).toBe(3);
    expect(stats.topPages[0].total).toBe(3);
    expect(stats.topPages[0].unique).toBe(1);
  });

  it('counts unique across different paths from same IP', async () => {
    const { trackVisit, getVisitStats } = await loadModule();
    trackVisit({ pathname: '/posts/a', ua: 'Mozilla/5.0', req: mkReq({ ip: '1.1.1.1' }) });
    trackVisit({ pathname: '/posts/b', ua: 'Mozilla/5.0', req: mkReq({ ip: '1.1.1.1' }) });
    trackVisit({ pathname: '/posts/c', ua: 'Mozilla/5.0', req: mkReq({ ip: '1.1.1.1' }) });

    const stats = getVisitStats();
    expect(stats.total).toBe(3);
    expect(stats.topPages).toHaveLength(3);
  });

  it('counts unique across different IPs', async () => {
    const { trackVisit, getVisitStats } = await loadModule();
    trackVisit({ pathname: '/posts/hello', ua: 'Mozilla/5.0', req: mkReq({ ip: '1.1.1.1' }) });
    trackVisit({ pathname: '/posts/hello', ua: 'Mozilla/5.0', req: mkReq({ ip: '2.2.2.2' }) });
    trackVisit({ pathname: '/posts/hello', ua: 'Mozilla/5.0', req: mkReq({ ip: '3.3.3.3' }) });

    const stats = getVisitStats();
    expect(stats.topPages[0].total).toBe(3);
    expect(stats.topPages[0].unique).toBe(3);
  });

  it('records referrer hostname', async () => {
    const { trackVisit, getVisitStats } = await loadModule();
    trackVisit({ pathname: '/posts/x', ua: 'Mozilla/5.0', req: mkReq({ referer: 'https://www.google.com/search?q=ai' }) });
    trackVisit({ pathname: '/posts/x', ua: 'Mozilla/5.0', req: mkReq({ referer: 'https://twitter.com/foo' }) });
    trackVisit({ pathname: '/posts/x', ua: 'Mozilla/5.0', req: mkReq() });

    const stats = getVisitStats();
    const refs = stats.topReferrers.map(r => r.domain);
    expect(refs).toContain('google.com');
    expect(refs).toContain('twitter.com');
    expect(refs).toContain('(direct)');
  });

  it('handles long paths gracefully', async () => {
    const { trackVisit, getVisitStats } = await loadModule();
    const long = '/' + 'a'.repeat(300);
    trackVisit({ pathname: long, ua: 'Mozilla/5.0' });
    expect(getVisitStats().total).toBe(0);
  });

  it('handles missing user-agent header', async () => {
    const { trackVisit, getVisitStats } = await loadModule();
    const result = trackVisit({ pathname: '/posts/hello' });
    expect(result.tracked).toBe(false);
    expect(getVisitStats().total).toBe(0);
  });
});

describe('visits - getVisitStats', () => {
  beforeEach(() => { setupCwd(); });

  it('returns zeros when no data exists', async () => {
    const { getVisitStats } = await loadModule();
    const stats = getVisitStats();
    expect(stats.total).toBe(0);
    expect(stats.today).toBe(0);
    expect(stats.thisWeek).toBe(0);
    expect(stats.thisMonth).toBe(0);
    expect(stats.daily).toHaveLength(30);
    expect(stats.topPages).toHaveLength(0);
    expect(stats.topReferrers).toHaveLength(0);
  });

  it('returns daily array with correct length for given days', async () => {
    const { trackVisit, getVisitStats } = await loadModule();
    trackVisit({ pathname: '/posts/x', ua: 'Mozilla/5.0' });

    expect(getVisitStats({ days: 7 }).daily).toHaveLength(7);
    expect(getVisitStats({ days: 30 }).daily).toHaveLength(30);
    expect(getVisitStats({ days: 90 }).daily).toHaveLength(90);
  });

  it('aggregates by week and month correctly', async () => {
    const { trackVisit, getVisitStats } = await loadModule();
    trackVisit({ pathname: '/posts/x', ua: 'Mozilla/5.0' });
    const stats = getVisitStats();
    expect(stats.today).toBeGreaterThanOrEqual(1);
    expect(stats.thisWeek).toBeGreaterThanOrEqual(1);
    expect(stats.thisMonth).toBeGreaterThanOrEqual(1);
  });

  it('limits topPages to 10 entries', async () => {
    const { trackVisit, getVisitStats } = await loadModule();
    for (let i = 0; i < 15; i++) {
      trackVisit({ pathname: `/page-${i}`, ua: 'Mozilla/5.0', req: mkReq({ ip: `${i}.0.0.0` }) });
    }
    const stats = getVisitStats();
    expect(stats.topPages.length).toBeLessThanOrEqual(10);
  });
});

describe('visits - resetVisits', () => {
  beforeEach(() => { setupCwd(); });

  it('removes visit and session files', async () => {
    const { trackVisit, getVisitStats, resetVisits } = await loadModule();
    trackVisit({ pathname: '/posts/x', ua: 'Mozilla/5.0' });
    expect(getVisitStats().total).toBe(1);

    const ok = resetVisits();
    expect(ok).toBe(true);
    expect(getVisitStats().total).toBe(0);
  });
});

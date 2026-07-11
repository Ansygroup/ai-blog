const hits = new Map();

export function rateLimit(ip, max = 10, windowMs = 60000) {
  if (!ip) return { allowed: true };
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.start > windowMs) {
    hits.set(ip, { start: now, count: 1 });
    return { allowed: true };
  }
  entry.count++;
  if (entry.count > max) {
    const retryAfter = Math.ceil((windowMs - (now - entry.start)) / 1000);
    return { allowed: false, retryAfter };
  }
  return { allowed: true };
}

// Cleanup stale entries every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of hits) {
    if (now - entry.start > 120000) hits.delete(ip);
  }
}, 60000);

export function getRateLimitHeaders(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  const result = rateLimit(ip);
  return { ip, ...result };
}

import fs from 'fs';
import path from 'path';

const VISITS_PATH = path.join(process.cwd(), 'public', 'data', 'visits.json');
const SESSIONS_PATH = path.join(process.cwd(), 'public', 'data', 'visitor-sessions.json');

const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_DAYS = 365;

const BOT_PATTERNS = [
  /bot/i, /crawl/i, /spider/i, /slurp/i, /mediapartners/i,
  /facebookexternalhit/i, /baiduspider/i, /bingpreview/i,
  /yandex/i, /duckduckgo/i, /ahrefs/i, /semrush/i, /mj12/i,
  /petalbot/i, /dotbot/i, /headlesschrome/i, /lighthouse/i,
  /pagespeed/i, /gtmetrix/i, /preview/i, /monitor/i,
];

const ADMIN_PREFIXES = ['/admin', '/api', '/_next', '/favicon', '/robots', '/sitemap', '/feed', '/manifest', '/llms'];
const STATIC_EXT = /\.(css|js|map|ico|png|jpg|jpeg|gif|svg|webp|avif|woff2?|ttf|eot|otf|pdf|zip|txt|xml|json|mp4|webm|mp3)$/i;

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch {
    return false;
  }
}

function isBot(ua) {
  if (!ua) return true;
  return BOT_PATTERNS.some(p => p.test(ua));
}

function isTrackablePath(pathname) {
  if (!pathname) return false;
  if (ADMIN_PREFIXES.some(p => pathname.startsWith(p))) return false;
  if (pathname.startsWith('/admin/api')) return false;
  if (STATIC_EXT.test(pathname)) return false;
  if (pathname.length > 256) return false;
  return true;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function hashIp(ip) {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = ((hash << 5) - hash) + ip.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function getIp(req) {
  const xff = req?.headers?.get?.('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req?.headers?.get?.('x-real-ip') || 'unknown';
}

function getReferrer(req) {
  const ref = req?.headers?.get?.('referer') || req?.headers?.get?.('referrer') || '';
  if (!ref) return '(direct)';
  try {
    const url = new URL(ref);
    return url.hostname.replace(/^www\./, '') || '(direct)';
  } catch {
    return '(invalid)';
  }
}

function getSessions() {
  return readJson(SESSIONS_PATH, {});
}

function saveSessions(sessions) {
  const now = Date.now();
  for (const k of Object.keys(sessions)) {
    if (now - sessions[k] > SESSION_TTL_MS) delete sessions[k];
  }
  writeJson(SESSIONS_PATH, sessions);
}

function trimOldDates(byDate) {
  const keys = Object.keys(byDate).sort();
  if (keys.length <= MAX_DAYS) return byDate;
  const trimmed = {};
  for (let i = keys.length - MAX_DAYS; i < keys.length; i++) {
    trimmed[keys[i]] = byDate[keys[i]];
  }
  return trimmed;
}

export function trackVisit({ req, pathname, ua }) {
  if (!isTrackablePath(pathname)) return { tracked: false, reason: 'skipped-path' };
  const userAgent = ua || req?.headers?.get?.('user-agent') || '';
  if (isBot(userAgent)) return { tracked: false, reason: 'bot' };

  const ip = getIp(req);
  const ipHash = hashIp(ip);
  const dateKey = todayKey();

  const sessions = getSessions();
  const sessionKey = `${ipHash}:${pathname}`;
  const now = Date.now();
  const lastSeen = sessions[sessionKey];

  let isUnique = false;
  if (!lastSeen || now - lastSeen > SESSION_TTL_MS) {
    sessions[sessionKey] = now;
    isUnique = true;
  }

  const data = readJson(VISITS_PATH, {
    total: 0, totalUnique: 0, today: 0, thisWeek: 0, thisMonth: 0,
    byDate: {}, byPage: {}, byReferrer: {}, byCountry: {},
  });

  data.total++;
  if (isUnique) data.totalUnique++;

  data.byDate[dateKey] = (data.byDate[dateKey] || 0) + 1;
  if (!data._uniquePages) data._uniquePages = {};
  if (!data._uniquePageIps) data._uniquePageIps = {};
  data.byPage[pathname] = data.byPage[pathname] || { total: 0, unique: 0 };
  data.byPage[pathname].total++;
  if (isUnique) {
    const uniqueKey = `${dateKey}:${ipHash}:${pathname}`;
    if (!data._uniquePageIps[uniqueKey]) {
      data.byPage[pathname].unique++;
      data._uniquePageIps[uniqueKey] = 1;
    }
  }

  const referrer = getReferrer(req);
  data.byReferrer[referrer] = (data.byReferrer[referrer] || 0) + 1;

  data.byDate = trimOldDates(data.byDate);
  saveSessions(sessions);
  writeJson(VISITS_PATH, data);

  return { tracked: true, unique: isUnique };
}

export function getVisitStats({ days = 30 } = {}) {
  const data = readJson(VISITS_PATH, null);
  if (!data) {
    const now = new Date();
    const daily = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      daily.push({ date: d.toISOString().slice(0, 10), count: 0 });
    }
    return {
      total: 0, totalUnique: 0, today: 0, thisWeek: 0, thisMonth: 0,
      daily, topPages: [], topReferrers: [],
    };
  }

  const today = todayKey();
  const now = new Date();
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(now); monthAgo.setDate(monthAgo.getDate() - 30);
  const weekKey = weekAgo.toISOString().slice(0, 10);
  const monthKey = monthAgo.toISOString().slice(0, 10);

  let todayCount = 0, weekCount = 0, monthCount = 0;
  const daily = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const count = data.byDate[key] || 0;
    daily.push({ date: key, count });
    if (key === today) todayCount = count;
    if (key >= weekKey) weekCount += count;
    if (key >= monthKey) monthCount += count;
  }

  const topPages = Object.entries(data.byPage)
    .map(([path, stats]) => ({ path, total: stats.total, unique: stats.unique }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const topReferrers = Object.entries(data.byReferrer)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    total: data.total || 0,
    totalUnique: data.totalUnique || 0,
    today: todayCount,
    thisWeek: weekCount,
    thisMonth: monthCount,
    daily,
    topPages,
    topReferrers,
  };
}

export function resetVisits() {
  try {
    if (fs.existsSync(VISITS_PATH)) fs.unlinkSync(VISITS_PATH);
    if (fs.existsSync(SESSIONS_PATH)) fs.unlinkSync(SESSIONS_PATH);
    return true;
  } catch {
    return false;
  }
}

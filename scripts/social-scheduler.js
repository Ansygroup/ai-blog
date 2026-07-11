#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const DATA_PATH = path.join(__dirname, '..', 'public', 'data', 'social-schedule.json');
const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ai-blog-ten-steel.vercel.app';

const dryRun = process.argv.includes('--dry-run');

function getSchedule() {
  if (!fs.existsSync(DATA_PATH)) return [];
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}

function saveSchedule(schedule) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(schedule, null, 2), 'utf8');
}

function getPostMeta(slug) {
  const filePath = path.join(POSTS_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm = {};
  match[1].split('\n').forEach(line => {
    const sep = line.indexOf(':');
    if (sep === -1) return;
    const key = line.slice(0, sep).trim();
    let val = line.slice(sep + 1).trim();
    val = val.replace(/^['"](.*)['"]$/, '$1');
    fm[key] = val;
  });
  return { title: fm.title || slug, excerpt: fm.excerpt || '' };
}

// --- Platform publishers (adapted from social-content.js) ---
const https = require('https');

function httpsRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const opts = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function oauthHmacSha1(consumerSecret, tokenSecret, baseString) {
  const key = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret || '')}`;
  return crypto.createHmac('sha1', key).update(baseString).digest('base64');
}

function twitterOAuthHeader(method, url, params, consumerKey, consumerSecret, token, tokenSecret) {
  const oauth = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000),
    oauth_token: token,
    oauth_version: '1.0',
  };
  const allParams = { ...params, ...oauth };
  const paramString = Object.keys(allParams).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(String(allParams[k]))}`).join('&');
  const baseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  oauth.oauth_signature = oauthHmacSha1(consumerSecret, tokenSecret, baseString);
  return 'OAuth ' + Object.keys(oauth).sort().map(k => `${encodeURIComponent(k)}="${encodeURIComponent(String(oauth[k]))}"`).join(', ');
}

async function publishToTwitter(text, url) {
  const CK = process.env.TWITTER_CONSUMER_KEY;
  const CS = process.env.TWITTER_CONSUMER_SECRET;
  const AT = process.env.TWITTER_ACCESS_TOKEN;
  const AS = process.env.TWITTER_ACCESS_TOKEN_SECRET;
  if (!CK || !CS || !AT || !AS) { console.log('  ⏭ Twitter: missing credentials'); return false; }
  const fullText = `${text} ${url}`.slice(0, 280);
  if (dryRun) { console.log(`  🐦 Twitter (dry-run): ${fullText}`); return true; }
  const body = JSON.stringify({ text: fullText });
  const endpoint = 'https://api.twitter.com/2/tweets';
  const auth = twitterOAuthHeader('POST', endpoint, {}, CK, CS, AT, AS);
  try {
    const res = await httpsRequest(endpoint, { method: 'POST', headers: { 'Authorization': auth, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, body);
    if (res.status === 201) { console.log('  ✅ Twitter: posted'); return true; }
    console.log(`  ❌ Twitter: ${res.status} ${res.body}`);
    return false;
  } catch (e) { console.log(`  ❌ Twitter: ${e.message}`); return false; }
}

async function publishToLinkedIn(title, excerpt, url) {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const urn = process.env.LINKEDIN_PERSON_URN;
  if (!token || !urn) { console.log('  ⏭ LinkedIn: missing credentials'); return false; }
  const body = JSON.stringify({
    author: urn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: `${title}\n\n${excerpt}` },
        shareMediaCategory: 'ARTICLE',
        media: [{ status: 'READY', originalUrl: url }],
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  });
  if (dryRun) { console.log(`  💼 LinkedIn (dry-run): ${title}`); return true; }
  try {
    const res = await httpsRequest('https://api.linkedin.com/v2/ugcPosts', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' } }, body);
    if (res.status === 201) { console.log('  ✅ LinkedIn: posted'); return true; }
    console.log(`  ❌ LinkedIn: ${res.status} ${res.body}`);
    return false;
  } catch (e) { console.log(`  ❌ LinkedIn: ${e.message}`); return false; }
}

async function publishToFacebook(title, excerpt, url) {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) { console.log('  ⏭ Facebook: missing credentials'); return false; }
  const message = `${title}\n\n${excerpt}\n\n${url}`;
  const apiUrl = `https://graph.facebook.com/v20.0/${pageId}/feed?message=${encodeURIComponent(message)}&access_token=${token}`;
  if (dryRun) { console.log(`  📘 Facebook (dry-run): ${title}`); return true; }
  try {
    const res = await httpsRequest(apiUrl, { method: 'POST' });
    if (res.status === 200) { console.log('  ✅ Facebook: posted'); return true; }
    console.log(`  ❌ Facebook: ${res.status} ${res.body}`);
    return false;
  } catch (e) { console.log(`  ❌ Facebook: ${e.message}`); return false; }
}

async function publishToPinterest(title, excerpt, url, imageUrl) {
  const token = process.env.PINTEREST_ACCESS_TOKEN;
  if (!token) { console.log('  ⏭ Pinterest: missing credentials'); return false; }
  const pinBody = JSON.stringify({
    board_id: process.env.PINTEREST_BOARD_ID || '',
    title: title,
    description: excerpt || title,
    link: url,
    alt_text: title,
  });
  if (dryRun) { console.log(`  📌 Pinterest (dry-run): ${title}`); return true; }
  try {
    const res = await httpsRequest('https://api.pinterest.com/v5/pins', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }, pinBody);
    if (res.status === 201) { console.log('  ✅ Pinterest: posted'); return true; }
    console.log(`  ❌ Pinterest: ${res.status} ${res.body}`);
    return false;
  } catch (e) { console.log(`  ❌ Pinterest: ${e.message}`); return false; }
}

async function publishItem(item) {
  const meta = getPostMeta(item.postSlug);
  if (!meta) {
    console.log(`  ⏭ Post "${item.postSlug}" not found`);
    return 'post-not-found';
  }
  const url = `${siteUrl}/posts/${item.postSlug}`;
  const msg = item.customMessage || meta.title;
  const shortExcerpt = (meta.excerpt || meta.title).slice(0, 150);

  let successes = 0;
  let failures = 0;

  for (const platform of item.platforms) {
    let ok = false;
    switch (platform) {
      case 'twitter':  ok = await publishToTwitter(msg, url); break;
      case 'linkedin': ok = await publishToLinkedIn(meta.title, shortExcerpt, url); break;
      case 'facebook': ok = await publishToFacebook(meta.title, shortExcerpt, url); break;
      case 'pinterest': ok = await publishToPinterest(meta.title, shortExcerpt, url); break;
    }
    if (ok) successes++; else failures++;
  }

  return failures > 0 && successes === 0 ? 'failed' : 'published';
}

(async () => {
  const schedule = getSchedule();
  if (schedule.length === 0) {
    console.log('No scheduled posts found.');
    process.exit(0);
  }

  const now = new Date();
  const due = schedule.filter(s => s.status === 'pending' && new Date(s.scheduledDate) <= now);

  if (due.length === 0) {
    console.log(`No posts due. ${schedule.filter(s => s.status === 'pending').length} pending, ${schedule.filter(s => s.status === 'published').length} published.`);
    process.exit(0);
  }

  console.log(`Processing ${due.length} scheduled post(s)...`);
  if (dryRun) console.log('🔍 DRY RUN — no actual posts will be sent\n');

  for (const item of due) {
    console.log(`\n📅 ${item.postSlug} -> ${item.platforms.join(', ')}`);
    const result = await publishItem(item);
    if (!dryRun) {
      item.status = result;
    }
  }

  if (!dryRun) {
    saveSchedule(schedule);
    const published = schedule.filter(s => s.status === 'published').length;
    console.log(`\n✅ Done. Published: ${published}, Failed: ${due.filter(s => s.status === 'failed').length}`);
  } else {
    console.log('\n🔍 Dry run complete.');
  }

  // Save to social-content fallback file too
  const socialDir = path.join(__dirname, '..', 'public', 'social');
  fs.mkdirSync(socialDir, { recursive: true });
  const lines = due.map(item => {
    const meta = getPostMeta(item.postSlug);
    return `---\nPost: ${meta?.title || item.postSlug}\nURL: ${siteUrl}/posts/${item.postSlug}\nPlatforms: ${item.platforms.join(', ')}\nScheduled: ${item.scheduledDate}\nStatus: ${item.status}\n`;
  });
  fs.writeFileSync(path.join(socialDir, `scheduler-${Date.now()}.txt`), lines.join('\n'), 'utf8');
})();

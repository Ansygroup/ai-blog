#!/usr/bin/env node
/**
 * scripts/indexnow-submit.js
 *
 * Submits every published post URL to IndexNow (Bing + Yandex + DuckDuckGo).
 * IndexNow = near-instant indexing for AI search engines, since ChatGPT
 * browse and Perplexity primarily use Bing's index.
 *
 * Run: node scripts/indexnow-submit.js
 *   or: curl https://api.indexnow.org/indexnow?...
 *
 * After every deploy, GitHub Actions calls this script automatically.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const HOST = process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, '').replace(/\/$/, '') || 'ai-blog-ten-steel.vercel.app';
const KEY = process.env.INDEXNOW_KEY;
if (!KEY) { console.error('❌ INDEXNOW_KEY missing — set INDEXNOW_KEY env var'); process.exit(1); }

const urlList = [
  `${process.env.NEXT_PUBLIC_SITE_URL}/`,
  `${process.env.NEXT_PUBLIC_SITE_URL}/reviews`,
  ...fs.readdirSync(path.join(__dirname, '..', 'content', 'posts'))
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => `${process.env.NEXT_PUBLIC_SITE_URL}/posts/${f.replace(/\.mdx?$/, '')}`),
];

const body = JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList });

const req = https.request({
  hostname: 'api.indexnow.org',
  port: 443,
  path: '/indexnow',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
}, (res) => {
  console.log(`📡 IndexNow: ${res.statusCode} — submitted ${urlList.length} URLs`);
  if (res.statusCode >= 400) {
    let data = ''; res.on('data', (c) => data += c); res.on('end', () => console.error(data));
  }
});
req.on('error', (e) => console.error('❌', e.message));
req.write(body); req.end();

// Also generate the key verification file in /public
fs.writeFileSync(path.join(__dirname, '..', 'public', `${KEY}.txt`), KEY);
console.log(`✅ Wrote /public/${KEY}.txt for verification`);

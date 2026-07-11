#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { groqGenerate, hasGroqKey } = require('./ai-agent');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const SOCIAL_DIR = path.join(__dirname, '..', 'public', 'social');
if (!fs.existsSync(SOCIAL_DIR)) fs.mkdirSync(SOCIAL_DIR, { recursive: true });

const args = process.argv.slice(2);
const fileArg = args.find(a => !a.startsWith('--'));
const allPosts = args.includes('--all');
const dryRun = args.includes('--dry-run');
const useAI = args.includes('--ai');

function getNewPosts() {
  if (fileArg && fs.existsSync(fileArg)) return [fileArg];
  if (allPosts) return fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx')).sort().slice(-10).map(f => path.join(POSTS_DIR, f));
  return [];
}

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
  const authHeader = 'OAuth ' + Object.keys(oauth).sort().map(k => `${encodeURIComponent(k)}="${encodeURIComponent(String(oauth[k]))}"`).join(', ');
  return authHeader;
}

async function postToTwitter(text, url) {
  const CK = process.env.TWITTER_CONSUMER_KEY;
  const CS = process.env.TWITTER_CONSUMER_SECRET;
  const AT = process.env.TWITTER_ACCESS_TOKEN;
  const AS = process.env.TWITTER_ACCESS_TOKEN_SECRET;
  if (!CK || !CS || !AT || !AS) { console.log('  ⏭ Twitter: missing credentials'); return false; }

  const fullText = `${text} ${url}`.slice(0, 280);
  const body = JSON.stringify({ text: fullText });
  const endpoint = 'https://api.twitter.com/2/tweets';
  const auth = twitterOAuthHeader('POST', endpoint, {}, CK, CS, AT, AS);

  if (dryRun) { console.log(`  🐦 Twitter (dry-run): ${fullText}`); return true; }

  try {
    const res = await httpsRequest(endpoint, { method: 'POST', headers: { 'Authorization': auth, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, body);
    if (res.status === 201) { console.log('  ✅ Twitter: posted'); return true; }
    console.log(`  ❌ Twitter: ${res.status} ${res.body}`);
    return false;
  } catch (e) { console.log(`  ❌ Twitter: ${e.message}`); return false; }
}

async function postToLinkedIn(title, excerpt, url) {
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

async function postToFacebook(title, excerpt, url) {
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

async function aiGeneratePost(title, excerpt, body, platform) {
  const cleanBody = body.replace(/<[^>]+>/g, '').replace(/[#*`>_~|]/g, '').replace(/\n+/g, ' ').trim().slice(0, 1000);
  const prompt = `Generate a ${platform} post to promote this blog article. Make it engaging and platform-appropriate.

Title: "${title}"
Excerpt: "${excerpt}"
Content preview: ${cleanBody}

Rules for ${platform}:
${platform === 'Twitter' ? '- Max 250 characters (we add the URL separately)\n- Use relevant hashtags (1-2 max)\n- Hook in first 50 chars' : ''}
${platform === 'LinkedIn' ? '- Professional tone\n- 2-3 short paragraphs\n- End with a question to drive engagement\n- Add 3-4 relevant hashtags' : ''}
${platform === 'Facebook' ? '- Conversational tone\n- 2-3 short paragraphs\n- Include a call to action\n- Add 2-3 relevant hashtags' : ''}

Return ONLY the post text, nothing else.`;

  return groqGenerate(prompt, { temperature: 0.6, maxTokens: 400 });
}

(async () => {
  const files = getNewPosts();
  if (files.length === 0) {
    console.log('No posts specified. Usage: node scripts/social-content.js <file> [--all] [--dry-run] [--ai]');
    process.exit(0);
  }
  if (dryRun) console.log('🔍 DRY RUN — no posts will be sent\n');
  if (useAI) {
    if (hasGroqKey()) {
      console.log('🤖 AI mode — Groq-powered social posts\n');
    } else {
      console.log('⚠️ --ai flag used but no GROQ_API_KEY found. Falling back to template-based posts.\n');
    }
  }

  const posts = files.map(f => {
    const c = fs.readFileSync(f, 'utf8');
    const get = (k) => (c.match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm')) || [])[1] || '';
    const body = c.replace(/^---[\s\S]+?---/, '').trim();
    return { file: f, slug: path.basename(f, '.mdx'), title: get('title'), excerpt: get('excerpt'), body };
  }).filter(p => p.title);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ai-blog-ten-steel.vercel.app';
  const posted = [];
  const skipped = [];
  const fileLines = [];

  for (const p of posts) {
    const url = `${siteUrl}/posts/${p.slug}`;
    const shortTitle = p.title.length > 60 ? p.title.slice(0, 57) + '...' : p.title;
    const shortExcerpt = (p.excerpt || shortTitle).length > 100 ? (p.excerpt || shortTitle).slice(0, 97) + '...' : (p.excerpt || shortTitle);

    console.log(`\n📄 ${p.title}`);
    console.log(`   ${url}`);

    let twitterText, linkedinText, facebookText;

    if (useAI && hasGroqKey()) {
      twitterText = await aiGeneratePost(p.title, p.excerpt, p.body, 'Twitter') || shortTitle;
      linkedinText = await aiGeneratePost(p.title, p.excerpt, p.body, 'LinkedIn') || `${shortTitle}\n\n${shortExcerpt}`;
      facebookText = await aiGeneratePost(p.title, p.excerpt, p.body, 'Facebook') || `${shortTitle}\n\n${shortExcerpt}`;
    } else {
      twitterText = shortTitle;
      linkedinText = `${shortTitle}\n\n${shortExcerpt}\n\nRead the full review: ${url}`;
      facebookText = `${shortTitle}\n\n${shortExcerpt}\n\n${url}`;
    }

    const twitterOk = await postToTwitter(twitterText, url);
    const linkedinOk = await postToLinkedIn(linkedinText, shortExcerpt, url);
    const facebookOk = await postToFacebook(facebookText, shortExcerpt, url);

    if (twitterOk || linkedinOk || facebookOk) {
      posted.push(p.title);
    } else {
      skipped.push(p.title);
    }

    fileLines.push('=== Social Posts ===');
    fileLines.push(`Post: ${p.title}`);
    fileLines.push(`URL: ${url}`);
    fileLines.push('');
    fileLines.push('--- Twitter ---');
    fileLines.push(twitterText + ' ' + url);
    fileLines.push('');
    fileLines.push('--- LinkedIn ---');
    fileLines.push(linkedinText);
    fileLines.push('');
    fileLines.push('--- Facebook ---');
    fileLines.push(facebookText);
    fileLines.push('');
    fileLines.push('------------------------');
    fileLines.push('');
  }

  const outputPath = path.join(SOCIAL_DIR, `social-${Date.now()}.txt`);
  fs.writeFileSync(outputPath, fileLines.join('\n'), 'utf8');

  console.log(`\n${'='.repeat(40)}`);
  console.log(`✅ Social content saved: ${outputPath}`);
  console.log(`📊 Posted: ${posted.length} | Skipped (no keys): ${skipped.length} | Total: ${posts.length}`);
  if (dryRun) console.log('🔍 Dry run complete — no actual posts were sent.');
  if (posted.length === 0 && !dryRun) console.log('💡 Set TWITTER_CONSUMER_KEY, LINKEDIN_ACCESS_TOKEN, or FACEBOOK_PAGE_ID + FACEBOOK_PAGE_ACCESS_TOKEN to enable live posting.');
})();

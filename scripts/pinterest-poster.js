#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const PIN_DATA_DIR = path.join(__dirname, '..', 'public', 'pins');
if (!fs.existsSync(PIN_DATA_DIR)) fs.mkdirSync(PIN_DATA_DIR, { recursive: true });

const args = process.argv.slice(2);
const fileArg = args.find(a => !a.startsWith('--'));
const allPosts = args.includes('--all');
const dryRun = args.includes('--dry-run');

const ACCESS_TOKEN = process.env.PINTEREST_ACCESS_TOKEN;
const BOARD_ID = process.env.PINTEREST_BOARD_ID || 'AI Tools Reviews';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ai-blog-ten-steel.vercel.app';

function getNewPosts() {
  if (fileArg && fs.existsSync(fileArg)) return [fileArg];
  if (allPosts) return fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx')).sort().slice(-10).map(f => path.join(POSTS_DIR, f));
  return [];
}

function parseFrontmatter(content) {
  const get = (k) => (content.match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm')) || [])[1] || '';
  const raw = content.split('---')[2] || content;
  const firstParagraph = raw.replace(/[#*`\[\]]/g, '').split('\n\n').find(p => p.trim().length > 50) || '';
  return {
    title: get('title'),
    excerpt: get('excerpt') || firstParagraph.trim().slice(0, 500),
    cover: get('cover') || '',
    slug: '',
    description: get('description') || get('excerpt') || firstParagraph.trim().slice(0, 500),
  };
}

function httpsRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const opts = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || { 'Content-Type': 'application/json' },
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

async function postToPinterest(title, description, url, imageUrl) {
  if (!ACCESS_TOKEN) { console.log('  ⏭ Pinterest: missing PINTEREST_ACCESS_TOKEN'); return false; }

  const pinTitle = title.slice(0, 100);
  const pinDesc = (description || title).slice(0, 500);
  const pinImage = imageUrl || `${SITE_URL}/api/og?title=${encodeURIComponent(title)}`;

  const body = JSON.stringify({
    title: pinTitle,
    description: pinDesc,
    link: url,
    alt_text: `${title} — AI tools review and tutorial`,
    board_id: BOARD_ID.startsWith('board:') || BOARD_ID.startsWith('https://') ? BOARD_ID : undefined,
    board_name: (!BOARD_ID.startsWith('board:') && !BOARD_ID.startsWith('https://')) ? BOARD_ID : undefined,
    media_source: { source_type: 'image_url', url: pinImage },
  });

  if (dryRun) {
    console.log(`  📌 Pinterest (dry-run): ${title}`);
    console.log(`     Board: ${BOARD_ID} | Image: ${pinImage}`);
    return true;
  }

  try {
    const res = await httpsRequest('https://api.pinterest.com/v5/pins', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    }, body);
    if (res.status === 201) { console.log('  ✅ Pinterest: pin created'); return true; }
    const parsed = JSON.parse(res.body);
    console.log(`  ❌ Pinterest: ${res.status} ${parsed.message || res.body}`);
    return false;
  } catch (e) { console.log(`  ❌ Pinterest: ${e.message}`); return false; }
}

(async () => {
  const files = getNewPosts();
  if (files.length === 0) {
    console.log('No posts specified. Usage: node scripts/pinterest-poster.js <file> [--all] [--dry-run]');
    process.exit(0);
  }
  if (dryRun) console.log('🔍 DRY RUN — no pins will be created\n');

  const pins = [];
  let posted = 0;
  let skipped = 0;

  for (const raw of files) {
    const file = fs.existsSync(raw) ? raw : path.join(POSTS_DIR, raw);
    if (!fs.existsSync(file)) { console.log(`  Skipped (not found): ${raw}`); continue; }

    const content = fs.readFileSync(file, 'utf8');
    const fm = parseFrontmatter(content);
    fm.slug = path.basename(file, '.mdx');
    const url = `${SITE_URL}/posts/${fm.slug}`;

    console.log(`\n📄 ${fm.title}`);
    console.log(`   ${url}`);

    if (await postToPinterest(fm.title, fm.description, url, fm.cover)) {
      posted++;
    } else {
      skipped++;
    }

    pins.push({ title: fm.title, slug: fm.slug, url, description: fm.description });
  }

  const pinDataPath = path.join(PIN_DATA_DIR, `pins-${Date.now()}.json`);
  fs.writeFileSync(pinDataPath, JSON.stringify(pins, null, 2), 'utf8');

  console.log(`\n${'='.repeat(40)}`);
  console.log(`📌 Pin data saved: ${pinDataPath}`);
  console.log(`📊 Created: ${posted} | Skipped: ${skipped} | Total: ${files.length}`);
  if (dryRun) console.log('🔍 Dry run complete — no pins were actually created.');
  if (posted === 0 && !dryRun) console.log('💡 Set PINTEREST_ACCESS_TOKEN to enable live pin creation.');
})();

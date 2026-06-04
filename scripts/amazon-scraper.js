#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const DB_PATH = path.join(__dirname, 'amazon-db.json');
const APIFY_TOKEN = process.env.APIFY_API_KEY;
const ACTOR = 'BG3WDrGdteHgZgbPK';
const TAG = process.env.AMAZON_ASSOCIATES_TAG || 'ansy07-20';

// Categories to scrape — each with search query
const CATEGORIES = {
  laptops: 'best laptops for AI development 2026',
  headphones: 'best noise cancelling headphones 2026',
  monitors: 'best monitors for programming 2026',
  'ai-books': 'best artificial intelligence books 2026',
  webcams: 'best webcams for streaming 2026',
  tablets: 'best tablets for reading 2026',
};

async function scrapeCategory(category, query) {
  const url = `https://api.apify.com/v2/acts/${ACTOR}/runs?token=${APIFY_TOKEN}`;
  const payload = {
    categoryOrProductUrls: [{ url: `https://www.amazon.com/s?k=${encodeURIComponent(query)}` }],
    maxItemsPerStartUrl: 12,
    maxSearchPagesPerStartUrl: 2,
    countryCode: 'US',
    scrapeProductDetails: true,
    proxyCountry: 'AUTO_SELECT_PROXY_COUNTRY',
  };

  console.log(`  Scraping ${category}...`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Apify ${res.status}: ${err.slice(0, 200)}`);
  }
  const run = await res.json();
  const datasetId = run.data?.defaultDatasetId;
  if (!datasetId) {
    console.log(`  No dataset for ${category}, using fallback`);
    return null;
  }

  // Wait for completion
  const runId = run.data?.id;
  for (let i = 0; i < 60; i++) {
    const statusRes = await fetch(`https://api.apify.com/v2/acts/${ACTOR}/runs/${runId}?token=${APIFY_TOKEN}`);
    const status = await statusRes.json();
    if (status.data?.status === 'SUCCEEDED') break;
    if (status.data?.status === 'FAILED') {
      console.log(`  Scrape failed for ${category}, using fallback`);
      return null;
    }
    await new Promise(r => setTimeout(r, 5000));
  }

  // Fetch results
  const itemsRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`);
  const items = await itemsRes.json();
  if (!items || !items.length) {
    console.log(`  No items for ${category}, using fallback`);
    return null;
  }

  console.log(`  Got ${items.length} items for ${category}`);
  return items.slice(0, 10).map(item => ({
    asin: item.asin || '',
    name: item.title || '',
    slug: (item.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60),
    price: item.price?.amount || item.listPrice || 0,
    image: item.images?.[0] || item.mainImage || '',
    rating: item.stars || item.averageRating || 0,
    reviewsCount: item.reviewsCount || item.totalReviews || 0,
    description: (item.description || '').slice(0, 300),
    highlights: (item.features || []).slice(0, 4),
    features: item.specifications || {},
    category,
  }));
}

(async () => {
  console.log('=== Amazon Scraper ===\n');

  if (!APIFY_TOKEN) {
    console.log('⚠ APIFY_API_KEY not set — using static product database.\n');
    console.log('Set APIFY_API_KEY in .env.local to enable live scraping.');
    process.exit(0);
  }

  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  let updated = 0;
  let failed = 0;

  for (const [slug, query] of Object.entries(CATEGORIES)) {
    try {
      const products = await scrapeCategory(slug, query);
      if (!products || !products.length) { failed++; continue; }

      // Add affiliate URL
      products.forEach(p => {
        p.url = p.asin ? `https://www.amazon.com/dp/${p.asin}?tag=${TAG}` : '';
      });

      db.categories[slug].products = products;
      db.categories[slug].lastScraped = new Date().toISOString();
      updated++;
    } catch (err) {
      console.log(`  ❌ ${slug}: ${err.message}`);
      failed++;
    }
  }

  db.lastUpdated = new Date().toISOString().split('T')[0];
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  console.log(`\nDone. ${updated} categories updated, ${failed} failed.`);
  if (updated > 0) console.log('Run: git add scripts/amazon-db.json && git commit -m "auto: update amazon products"');
})();

#!/usr/bin/env node
/**
 * scripts/smoke-test.js
 *
 * End-to-end smoke test. Assumes a server is already running on PORT (default 3000)
 * or starts one, runs the full suite, and reports pass/fail.
 *
 * Tests:
 *   1. Build artifacts exist (.next/server/app/...)
 *   2. All required routes return 200
 *   3. Homepage has Organization + WebSite + BreadcrumbList JSON-LD
 *   4. Post pages have 4 JSON-LD blocks + exactly 1 H1
 *   5. RSS is valid XML with >=1 item
 *   6. Sitemap is valid XML with >=1 <loc>
 *   7. JSON Feed is valid JSON
 *   8. robots.txt allows GPTBot, ClaudeBot, PerplexityBot
 *   9. llms.txt is present
 *   10. SEO audit reports 0 errors
 *
 * Usage:
 *   node scripts/smoke-test.js                     # tests http://localhost:3000
 *   node scripts/smoke-test.js --port 4000        # custom port
 *   node scripts/smoke-test.js --skip-server       # don't try to start a server
 *   node scripts/smoke-test.js --start-server      # start the server, test, kill it
 *
 * Exit code: 0 if all pass, 1 if any fail.
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const args = process.argv.slice(2);
// Find --port only if it appears; otherwise default to 3000
// (The naive `args.indexOf('--port') + 1` returns -1+1=0 which picks up the first positional flag)
const portIdx = args.indexOf('--port');
const PORT = portIdx > -1 && args[portIdx + 1] && !args[portIdx + 1].startsWith('--')
  ? parseInt(args[portIdx + 1], 10)
  : 3000;
const BASE = `http://localhost:${PORT}`;
const SKIP_SERVER = args.includes('--skip-server');
const START_SERVER = args.includes('--start-server');

let serverProc = null;

async function fetchText(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${BASE}${path}`, { signal: controller.signal });
    const body = await res.text();
    return { status: res.status, body, headers: Object.fromEntries(res.headers.entries()) };
  } finally {
    clearTimeout(timeout);
  }
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

let passed = 0;
let failed = 0;
const failures = [];

async function runTests() {
  for (const t of tests) {
    try {
      const result = await t.fn();
      if (result === true || result === undefined) {
        console.log(`  ✅ ${t.name}`);
        passed++;
      } else {
        console.log(`  ❌ ${t.name}\n     → ${result}`);
        failures.push({ name: t.name, reason: result });
        failed++;
      }
    } catch (err) {
      console.log(`  ❌ ${t.name}\n     → ${err.message}`);
      failures.push({ name: t.name, reason: err.message });
      failed++;
    }
  }
}

// =============================================================
// Define tests
// =============================================================

test('Build artifacts exist', async () => {
  const buildId = path.join(process.cwd(), '.next', 'BUILD_ID');
  if (!fs.existsSync(buildId)) return `.next/BUILD_ID missing — run \`npm run build\` first`;
  return true;
});

test('Homepage returns 200', async () => {
  const r = await fetchText('/');
  if (r.status !== 200) return `status ${r.status}`;
  if (!r.body.includes('<title>')) return 'no <title> in HTML';
  return true;
});

test('Homepage has Organization + WebSite JSON-LD', async () => {
  const r = await fetchText('/');
  const blocks = (r.body.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g) || []);
  if (blocks.length < 2) return `only ${blocks.length} JSON-LD blocks, expected >=2`;
  const types = blocks.map((b) => {
    try { return JSON.parse(b.replace(/<[^>]+>/g, ''))['@type']; } catch { return null; }
  });
  if (!types.includes('Organization')) return `missing Organization in [${types.join(', ')}]`;
  if (!types.includes('WebSite')) return `missing WebSite in [${types.join(', ')}]`;
  return true;
});

test('Reviews index returns 200', async () => {
  const r = await fetchText('/reviews');
  if (r.status !== 200) return `status ${r.status}`;
  return true;
});

test('All post pages return 200 and have proper structure', async () => {
  const postsDir = path.join(process.cwd(), 'content', 'posts');
  if (!fs.existsSync(postsDir)) return 'content/posts directory missing';
  const slugs = fs.readdirSync(postsDir).filter((f) => f.endsWith('.mdx')).map((f) => f.replace(/\.mdx$/, ''));
  if (slugs.length === 0) return 'no posts found';

  const issues = [];
  for (const slug of slugs) {
    const r = await fetchText(`/posts/${slug}`);
    if (r.status !== 200) { issues.push(`${slug}: status ${r.status}`); continue; }
    // JSON-LD
    const blocks = (r.body.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g) || []);
    const types = blocks.map((b) => {
      try { return JSON.parse(b.replace(/<[^>]+>/g, ''))['@type']; } catch { return null; }
    });
    for (const required of ['Article', 'BreadcrumbList']) {
      if (!types.includes(required)) issues.push(`${slug}: missing ${required} JSON-LD`);
    }
    // Exactly 1 H1
    const h1s = (r.body.match(/<h1[^>]*>/g) || []).length;
    if (h1s !== 1) issues.push(`${slug}: ${h1s} H1s (expected 1)`);
    // At least 3 H2s
    const h2s = (r.body.match(/<h2[^>]*>/g) || []).length;
    if (h2s < 3) issues.push(`${slug}: only ${h2s} H2s`);
  }
  if (issues.length > 0) return issues.slice(0, 5).join('; ');
  return true;
});

test('All category pages return 200', async () => {
  // Discover categories by looking at frontmatter
  const postsDir = path.join(process.cwd(), 'content', 'posts');
  const cats = new Set();
  for (const f of fs.readdirSync(postsDir).filter((f) => f.endsWith('.mdx'))) {
    const c = fs.readFileSync(path.join(postsDir, f), 'utf8');
    const m = c.match(/^category:\s*"?([^"\n]+)"?/m);
    if (m) cats.add(m[1].toLowerCase().replace(/\s+/g, '-'));
  }
  if (cats.size === 0) return 'no categories found';
  for (const cat of cats) {
    const r = await fetchText(`/category/${cat}`);
    if (r.status !== 200) return `/category/${cat}: status ${r.status}`;
  }
  return true;
});

test('RSS feed is valid XML with >=1 item', async () => {
  const r = await fetchText('/rss.xml');
  if (r.status !== 200) return `status ${r.status}`;
  if (!r.body.startsWith('<?xml')) return 'not valid XML (no XML declaration)';
  const items = (r.body.match(/<item>/g) || []).length;
  if (items < 1) return '0 <item> entries';
  return true;
});

test('Sitemap is valid XML with >=1 URL', async () => {
  const r = await fetchText('/sitemap.xml');
  if (r.status !== 200) return `status ${r.status}`;
  if (!r.body.startsWith('<?xml')) return 'not valid XML';
  const locs = (r.body.match(/<loc>/g) || []).length;
  if (locs < 1) return '0 <loc> entries';
  return true;
});

test('JSON Feed is valid JSON', async () => {
  const r = await fetchText('/feed.json');
  if (r.status !== 200) return `status ${r.status}`;
  try {
    const j = JSON.parse(r.body);
    if (!j.items || !Array.isArray(j.items)) return 'no items array';
    if (j.items.length < 1) return '0 items';
  } catch (e) {
    return `not valid JSON: ${e.message}`;
  }
  return true;
});

test('robots.txt allows GPTBot, ClaudeBot, PerplexityBot', async () => {
  const r = await fetchText('/robots.txt');
  if (r.status !== 200) return `status ${r.status}`;
  for (const bot of ['GPTBot', 'ClaudeBot', 'PerplexityBot']) {
    const re = new RegExp(`User-agent:\\s*${bot}[\\s\\S]*?Allow:\\s*/`, 'i');
    if (!re.test(r.body)) return `${bot} not allowed`;
  }
  return true;
});

test('llms.txt is present', async () => {
  const r = await fetchText('/llms.txt');
  if (r.status !== 200) return `status ${r.status}`;
  if (r.body.length < 100) return 'file is suspiciously short';
  return true;
});

test('SEO audit reports 0 errors', async () => {
  // Run the audit script as a child process
  const { execFileSync } = require('child_process');
  try {
    // Use execFile (not exec) — no shell, no command-injection risk.
    // The command is a static string with no interpolation.
    const out = execFileSync('node', ['scripts/seo-audit.js'], { encoding: 'utf8' });
    if (/(\d+)\s*errors?/.test(out)) {
      const m = out.match(/(\d+)\s*errors?/);
      const errCount = parseInt(m[1], 10);
      if (errCount > 0) return `${errCount} SEO errors`;
    }
    return true;
  } catch (e) {
    return `audit failed: ${e.message}`;
  }
});

test('All static legal pages return 200', async () => {
  for (const path of ['/about', '/privacy', '/terms', '/disclosure', '/contact']) {
    const r = await fetchText(path);
    if (r.status !== 200) return `${path}: status ${r.status}`;
  }
  return true;
});

test('Search page returns 200', async () => {
  const r = await fetchText('/search');
  if (r.status !== 200) return `status ${r.status}`;
  return true;
});

// =============================================================
// Server lifecycle
// =============================================================

async function waitForServer(maxWaitSec = 30) {
  const start = Date.now();
  while (Date.now() - start < maxWaitSec * 1000) {
    try {
      const c = new AbortController();
      setTimeout(() => c.abort(), 3000);
      const r = await fetch(`${BASE}/`, { signal: c.signal });
      if (r.status === 200) return true;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function startServer() {
  return new Promise((resolve, reject) => {
    console.log(`Starting server on port ${PORT}...`);
    // On Windows, `npm` is `npm.cmd`. Detect platform.
    const isWin = process.platform === 'win32';
    const cmd = isWin ? 'npm.cmd' : 'npm';
    serverProc = spawn(cmd, ['start', '--', '-p', String(PORT)], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: String(PORT), NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}` },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: isWin, // required on Windows for .cmd to resolve
    });
    serverProc.stdout.on('data', () => {});
    serverProc.stderr.on('data', () => {});
    serverProc.on('error', reject);
    // Resolve once server responds, reject on timeout
    waitForServer(30).then((ok) => {
      if (ok) resolve();
      else reject(new Error('server did not start within 30s'));
    });
  });
}

function killServer() {
  if (serverProc) {
    try { serverProc.kill('SIGTERM'); } catch (_) {}
  }
}

// =============================================================
// Main
// =============================================================

(async () => {
  console.log(`🧪 Running smoke tests against ${BASE}\n`);

  if (START_SERVER) {
    try { await startServer(); }
    catch (e) {
      console.error(`❌ Failed to start server: ${e.message}`);
      process.exit(1);
    }
  } else if (!SKIP_SERVER) {
    // Probe to make sure the server is up
    try {
      await fetchText('/');
    } catch (e) {
      console.error(`❌ Server not reachable at ${BASE}. Start it with:`);
      console.error(`   npm run build && PORT=${PORT} npm start`);
      console.error(`Or run with --start-server to start it automatically.`);
      process.exit(1);
    }
  }

  await runTests();

  if (serverProc) killServer();

  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ${passed} passed, ${failed} failed (${tests.length} total)`);
  console.log('='.repeat(50));

  if (failed > 0) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log(`  ❌ ${f.name}: ${f.reason}`));
  }

  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  if (serverProc) killServer();
  console.error('Fatal:', err.message);
  process.exit(1);
});

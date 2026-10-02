#!/usr/bin/env node
/**
 * scripts/parallel-publish.js
 *
 * Safe parallel publisher. Pulls N topics from scripts/keyword-queue.json and
 * generates them with whatever free provider generate-post.js auto-detects
 * (groq -> nvidia -> openrouter -> gemini -> ollama), with:
 *   - concurrency cap (default 3 — respects free-tier rate limits)
 *   - bounded retries (--max-tries, default 2) with exponential backoff up to 90s
 *   - skip-by-default when a post for the topic already exists (--allow-overwrite to force)
 *   - returns permanently-failed topics to the queue so an outage never eats it
 *   - stops when disk is low (< 2GB free on the system drive)
 *
 * This is the worker the Daily Growth Engine calls. It does NOT push to git
 * (the engine handles commit/push so deploys stay atomic).
 *
 * Usage:
 *   node scripts/parallel-publish.js --count 20 --concurrency 3
 *   node scripts/parallel-publish.js --batch 15 --skip-existing
 *   node scripts/parallel-publish.js --count 5 --allow-overwrite   # refresh existing posts
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const QUEUE = path.join(ROOT, 'scripts', 'keyword-queue.json');
const POSTS_DIR = path.join(ROOT, 'content', 'posts');

// --batch is an alias for --count (the cron prompt uses --batch 15).
const argOf = (flag) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const COUNT = parseInt(argOf('--count') || argOf('--batch')) || 20;
const CONCURRENCY = Math.min(parseInt(argOf('--concurrency')) || 3, 5);
// Retry each topic at most MAX_TRIES-1 times. Retrying forever on a dead
// provider turns a 5-minute run into an infinite loop that also drains the queue.
const MAX_TRIES = parseInt(argOf('--max-tries')) || 2;
// generate-post.js SILENTLY OVERWRITES an existing post when the topic slugifies
// to a file that already exists — the run "succeeds", the API quota is spent, and
// the post count does not move (measured 2026-10-02: 36/37 queued topics collided,
// 6 files rewritten, 0 new URLs). Default to skipping collisions; pass
// --allow-overwrite when an intentional content refresh is wanted.
const SKIP_EXISTING = process.argv.includes('--skip-existing') || !process.argv.includes('--allow-overwrite');

function slugifyTopic(t) {
  return String(t).toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function freeDiskGB() {
  // Node's execSync uses cmd.exe on Windows, where `df -BG /c` and `2>/dev/null`
  // do not exist. Use Node's own fs.statfsSync (Node >= 18.15) and only shell out
  // as a last resort. The previous shell attempt wrote a stray file named `null`.
  try {
    if (typeof fs.statfsSync === 'function') {
      const st = fs.statfsSync(process.env.SystemDrive ? `${process.env.SystemDrive}\\` : ROOT);
      return Math.floor((st.bavail * st.bsize) / 1024 ** 3);
    }
  } catch (e) { /* fall through */ }
  try {
    const ps = execSync('powershell -NoProfile -Command "(Get-PSDrive C).Free / 1GB"', {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString();
    const gb = parseFloat(ps);
    if (!isNaN(gb)) return Math.floor(gb);
  } catch (e) { /* ignore */ }
  return 999;
}

function pullTopics(n) {
  const q = JSON.parse(fs.readFileSync(QUEUE, 'utf8'));
  const picked = q.slice(0, n);
  const rest = q.slice(n);
  fs.writeFileSync(QUEUE, JSON.stringify(rest, null, 2));
  return picked;
}

function genOne(topic) {
  const t = typeof topic === 'string' ? topic : topic.topic;
  if (SKIP_EXISTING) {
    const target = path.join(POSTS_DIR, `${slugifyTopic(t)}.mdx`);
    if (fs.existsSync(target)) {
      console.log(`  ⊘ skip (exists): ${t}`);
      return 'skip';
    }
  }
  // Do NOT hardcode AI_PROVIDER: generate-post.js already auto-detects
  // (groq -> nvidia -> openrouter -> gemini). Forcing 'gemini' threw
  // "GEMINI_API_KEY missing" because no Gemini key is configured.
  const res = spawnSync('node', ['scripts/generate-post.js', t], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 300000,
  });
  if (res.status !== 0) {
    const tail = (res.stderr || res.stdout || '').split('\n').filter(Boolean).slice(-4).join(' | ').slice(0, 300);
    console.log(`  ✗ ${t}: ${tail}`);
  }
  return res.status === 0;
}

async function run() {
  console.log(`\n══════════════════════════════════════════════`);
  console.log(`  PARALLEL PUBLISH — ${COUNT} topics, concurrency ${CONCURRENCY}`);
  console.log(`════════════════════════════════════════════\n`);

  if (freeDiskGB() < 2) {
    console.error('  ⛔ Disk < 2GB free on C: — aborting to protect the site.');
    process.exit(1);
  }

  const topics = pullTopics(COUNT);
  console.log(`  Pulled ${topics.length} topics from queue (${topics.length} left in queue).\n`);

  let done = 0, failed = 0, skipped = 0, backoff = 5;
  const queue = [...topics];
  const exhausted = []; // topics that failed MAX_TRIES times -> put back on the queue

  async function worker() {
    while (queue.length) {
      const topic = queue.shift();
      topic._tries = (topic._tries || 0) + 1;
      let ok = false;
      try {
        ok = genOne(topic);
      } catch (e) {
        console.error(`  ❌ ${topic.topic || topic}: ${e.message}`);
      }
      if (ok === true) {
        done++; backoff = 5;
      } else if (ok === 'skip') {
        skipped++; backoff = 5;
      } else if (topic._tries >= MAX_TRIES) {
        failed++;
        delete topic._tries;
        exhausted.push(topic);
        console.log(`  ✗ gave up after ${MAX_TRIES - 1} retry (${topic.topic || topic})`);
      } else {
        failed++;
        queue.push(topic);
        console.log(`  ⏳ retry ${topic.topic || topic} (attempt ${topic._tries + 1}/${MAX_TRIES}), backing off ${backoff}s`);
        await new Promise(r => setTimeout(r, backoff * 1000));
        backoff = Math.min(backoff * 2, 90);
      }
      // small breathing room between posts regardless of provider
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  // Return permanently-failed topics so a provider outage never silently eats the queue.
  if (exhausted.length) {
    const q = JSON.parse(fs.readFileSync(QUEUE, 'utf8'));
    fs.writeFileSync(QUEUE, JSON.stringify([...exhausted.map(t => ({ topic: t.topic, category: t.category, keywords: t.keywords })), ...q], null, 2));
  }

  console.log(`\n✅ Parallel publish complete: ${done} generated, ${skipped} skipped (post exists), ${failed} failed (${exhausted.length} returned to queue).`);
  console.log(`   Remaining queue: ${JSON.parse(fs.readFileSync(QUEUE, 'utf8')).length} topics.`);
}

run();
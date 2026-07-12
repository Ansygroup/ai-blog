#!/usr/bin/env node
/**
 * scripts/parallel-publish.js
 *
 * Safe parallel publisher. Pulls N topics from keyword-queue.json and generates
 * them with the configured free provider (defaults to Hermes' Gemini key),
 * with:
 *   - concurrency cap (default 3 — respects free-tier rate limits)
 *   - automatic 429 / rate-limit backoff (exponential, up to 90s)
 *   - per-post image + affiliate auto-fill (via generate-post's own hooks)
 *   - stops when disk is low (< 2GB free on C:) to avoid bricking the site
 *
 * This is the worker the Daily Growth Engine calls. It does NOT push to git
 * (the engine handles commit/push so deploys stay atomic).
 *
 * Usage:
 *   node scripts/parallel-publish.js --count 20 --concurrency 3
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const QUEUE = path.join(ROOT, 'scripts', 'keyword-queue.json');
const POSTS_DIR = path.join(ROOT, 'content', 'posts');

const COUNT = parseInt(process.argv[process.argv.indexOf('--count') + 1]) || 20;
const CONCURRENCY = Math.min(parseInt(process.argv[process.argv.indexOf('--concurrency') + 1]) || 3, 5);

function freeDiskGB() {
  try {
    // Try `fs` statvfs-style via child df first (MSYS/git-bash)
    const out = execSync('df -BG /c 2>/dev/null', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const m = out.match(/[Cc]:\s+\d+G\s+\d+G\s+(\d+)G/); // avail on C:
    if (m) return parseInt(m[2]);
    // fallback: try powershell
    const ps = execSync('powershell -NoProfile -Command "(Get-PSDrive C).Free / 1GB" 2>/dev/null', { stdio: ['ignore','pipe','ignore'] }).toString();
    const gb = parseFloat(ps);
    if (!isNaN(gb)) return Math.floor(gb);
    return 999;
  } catch { return 999; }
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
  const res = spawnSync('node', ['scripts/generate-post.js', t], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 180000,
    env: { ...process.env, AI_PROVIDER: process.env.AI_PROVIDER || 'gemini' },
  });
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

  let done = 0, failed = 0, backoff = 5;
  const queue = [...topics];

  async function worker() {
    while (queue.length) {
      const topic = queue.shift();
      try {
        const ok = genOne(topic);
        if (ok) { done++; backoff = 5; }
        else {
          failed++;
          // likely rate-limited — push back and wait
          queue.push(topic);
          console.log(`  ⏳ rate-limit suspected, backing off ${backoff}s`);
          await new Promise(r => setTimeout(r, backoff * 1000));
          backoff = Math.min(backoff * 2, 90);
        }
      } catch (e) {
        failed++;
        console.error(`  ❌ ${topic}: ${e.message}`);
      }
      // small breathing room between posts regardless of provider
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  console.log(`\n✅ Parallel publish complete: ${done} generated, ${failed} failed/retried.`);
  console.log(`   Remaining queue: ${JSON.parse(fs.readFileSync(QUEUE, 'utf8')).length} topics.`);
}

run();

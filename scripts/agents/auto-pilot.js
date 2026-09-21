#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { json, hasKey, generate } = require('../ai-agent');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.local') });

const POSTS_DIR = path.join(__dirname, '..', '..', 'content', 'posts');
const LOG_DIR = path.join(__dirname, '..', '..', 'public', 'auto-pilot');
const LOG_FILE = path.join(LOG_DIR, 'history.json');
const MAX_LOG_ENTRIES = 50;

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const fullCycle = args.includes('--full');
const singleScript = args.find(a => a && !a.startsWith('--'));

function getPostFiles() {
  return fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
}

function parseFrontmatter(content) {
  const get = (k) => (content.match(new RegExp(`^${k}:\\s*"?([^"\n]*)"?`, 'm')) || [])[1] || '';
  const num = (k) => { const m = content.match(new RegExp(`^${k}:\\s*(\\d+)`, 'm')); return m ? parseInt(m[1]) : null; };
  return {
    title: get('title'),
    date: get('date'),
    excerpt: get('excerpt'),
    category: get('category'),
    tags: get('tags'),
    seoScore: num('seoScore'),
    wordCount: num('wordCount'),
  };
}

function getBody(content) {
  const parts = content.split('---');
  return parts.slice(2).join('---').trim();
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function scanSiteState() {
  const files = getPostFiles();
  const posts = files.map(f => {
    const content = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8');
    return { slug: f.replace(/\.mdx$/, ''), ...parseFrontmatter(content), body: getBody(content), raw: content };
  });

  const now = Date.now();
  let weakSeoCount = 0, oldPosts = 0, noFaqCount = 0;
  let thinContent = 0, missingExcerpt = 0, shortExcerpt = 0;
  let noAffiliateDisclosure = 0;

  for (const p of posts) {
    if (p.seoScore !== null && p.seoScore < 70) weakSeoCount++;
    if (p.date) {
      const d = new Date(p.date);
      if (now - d.getTime() > 180 * 86400000) oldPosts++;
    }
    if (!p.body.includes('## FAQ')) noFaqCount++;
    if (wordCount(p.body) < 700) thinContent++;
    if (!p.excerpt) missingExcerpt++;
    else if (p.excerpt.length < 100 || p.excerpt.length > 170) shortExcerpt++;
    if (!p.raw.toLowerCase().includes('affiliate') && !p.raw.toLowerCase().includes('disclosure')) noAffiliateDisclosure++;
  }

  const totalInternalLinks = posts.reduce((sum, p) => {
    const links = p.body.match(/\]\(\/posts\/[^)]+\)/g);
    return sum + (links ? links.length : 0);
  }, 0);

  const queuePath = path.join(__dirname, '..', 'keyword-queue.json');
  const queue = fs.existsSync(queuePath) ? JSON.parse(fs.readFileSync(queuePath, 'utf8')) : [];

  return {
    totalPosts: posts.length,
    weakSeoCount, oldPosts, noFaqCount, thinContent, missingExcerpt, shortExcerpt, noAffiliateDisclosure,
    totalInternalLinks,
    queueLength: queue.length,
    posts,
  };
}

async function decideAction(state) {
  const issues = [];
  if (state.weakSeoCount > 0) issues.push({ type: 'seo', count: state.weakSeoCount, priority: 1, reason: `${state.weakSeoCount} posts have SEO score < 70` });
  if (state.thinContent > 0) issues.push({ type: 'thin', count: state.thinContent, priority: 2, reason: `${state.thinContent} posts under 700 words` });
  if (state.noFaqCount > 0) issues.push({ type: 'faq', count: state.noFaqCount, priority: 3, reason: `${state.noFaqCount} posts missing FAQ section` });
  if (state.missingExcerpt > 0) issues.push({ type: 'excerpt', count: state.missingExcerpt, priority: 4, reason: `${state.missingExcerpt} posts missing excerpt` });
  if (state.oldPosts > 0) issues.push({ type: 'stale', count: state.oldPosts, priority: 5, reason: `${state.oldPosts} posts older than 6 months` });
  if (state.queueLength < 5) issues.push({ type: 'queue', count: state.queueLength, priority: 6, reason: `Keyword queue low (${state.queueLength} topics)` });

  if (issues.length === 0) {
    return { action: 'none', reason: 'Site healthy — no action needed', priority: 0 };
  }

  issues.sort((a, b) => a.priority - b.priority);
  const top = issues[0];

  const scriptMap = {
    seo: 'scripts/seo-optimizer.js',
    thin: 'scripts/expand-thin-content.js',
    faq: 'scripts/generate-faq.js',
    excerpt: 'scripts/fix-excerpts.js',
    stale: 'scripts/content-refresher.js',
    queue: 'scripts/content-strategy.js',
  };

  return {
    action: top.type,
    script: scriptMap[top.type],
    args: ['--ai', '--fix'],
    priority: top.priority,
    reason: top.reason,
    expectedImpact: `Fixes ${top.type} for ${top.count} posts`,
  };
}

function runScript(script, args = []) {
  const scriptPath = path.join(__dirname, '..', script);
  if (!fs.existsSync(scriptPath)) return { success: false, error: `Script not found: ${script}` };

  const cmd = `node "${scriptPath}"${args.length ? ' ' + args.map(a => `"${a}"`).join(' ') : ''}`;
  try {
    const output = execSync(cmd, {
      cwd: path.join(__dirname, '..', '..'),
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf8',
    });
    return { success: true, output: output.trim() };
  } catch (err) {
    return { success: false, error: err.message, output: err.stdout || '' };
  }
}

function loadHistory() {
  try {
    if (fs.existsSync(LOG_FILE)) return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
  } catch {}
  return [];
}

function saveHistory(entry) {
  const history = loadHistory();
  history.unshift(entry);
  if (history.length > MAX_LOG_ENTRIES) history.length = MAX_LOG_ENTRIES;
  fs.writeFileSync(LOG_FILE, JSON.stringify(history, null, 2));
}

(async () => {
  console.log('🤖 AUTO-PILOT AGENT v1.0\n');

  if (!hasKey()) {
    console.log('❌ AI API key required (GEMINI_API_KEY, OPENROUTER_API_KEY, or GROQ_API_KEY).');
    process.exit(1);
  }

  const startTime = Date.now();
  const state = scanSiteState();
  console.log(`📊 Site scan: ${state.totalPosts} posts, ${state.weakSeoCount} weak SEO, ${state.thinContent} thin, ${state.queueLength} queue`);

  const decision = await decideAction(state);
  console.log(`\n🎯 Decision: ${decision.action.toUpperCase()} — ${decision.reason}`);

  if (decision.action === 'none') {
    console.log('✅ No action needed.');
    return;
  }

  if (dryRun) {
    console.log(`[DRY RUN] Would run: ${decision.script} ${decision.args.join(' ')}`);
    return;
  }

  if (singleScript) {
    const result = runScript(singleScript, ['--ai', '--fix']);
    console.log(result.success ? '✅ Done' : `❌ ${result.error}`);
    return;
  }

  if (decision.script) {
    const result = runScript(decision.script, decision.args);
    console.log(result.success ? '✅ Done' : `❌ ${result.error}`);
    if (result.output) console.log(result.output.slice(0, 500));
  }

  saveHistory({ timestamp: new Date().toISOString(), action: decision.action, reason: decision.reason, durationMs: Date.now() - startTime });
  console.log(`\n⏱️  Completed in ${Date.now() - startTime}ms`);
})();
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { groqJson, hasGroqKey } = require('../ai-agent');
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
  const get = (k) => (content.match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm')) || [])[1] || '';
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
    totalPosts: files.length,
    weakSeoCount,
    oldPosts,
    noFaqCount,
    thinContent,
    missingExcerpt,
    shortExcerpt,
    noAffiliateDisclosure,
    totalInternalLinks,
    avgLinksPerPost: files.length ? (totalInternalLinks / files.length).toFixed(1) : '0',
    queueSize: queue.length,
    strongSeo: posts.filter(p => p.seoScore !== null && p.seoScore >= 80).length,
    needsImprovement: posts.filter(p => p.seoScore !== null && p.seoScore >= 70 && p.seoScore < 80).length,
  };
}

async function aiPlan(state) {
  const prompt = `You are the Auto-Pilot operations director for a blog. Based on these site stats, create a prioritized execution plan.

Site Stats:
- Total posts: ${state.totalPosts}
- Weak SEO (<70): ${state.weakSeoCount}
- Needs improvement (70-79): ${state.needsImprovement}
- Strong (80+): ${state.strongSeo}
- Stale (>6 months): ${state.oldPosts}
- No FAQ section: ${state.noFaqCount}
- Thin content (<700 words): ${state.thinContent}
- Missing excerpt: ${state.missingExcerpt}
- Bad excerpt length: ${state.shortExcerpt}
- No affiliate disclosure: ${state.noAffiliateDisclosure}
- Total internal links: ${state.totalInternalLinks}
- Avg links per post: ${state.avgLinksPerPost}
- Queue size: ${state.queueSize}

Available scripts to run:
1. "seo-optimizer" — node scripts/seo-optimizer.js --fix (fixes SEO scores, excerpts, titles)
2. "fix-excerpts" — node scripts/fix-excerpts.js (trims excerpts to 120-160 chars) or node scripts/fix-excerpts.js --ai (AI excerpts)
3. "expand-thin-content" — node scripts/expand-thin-content.js (expands posts <700 words)
4. "auto-internal-link" — node scripts/auto-internal-link.js (adds contextual internal links) or --ai for AI mode
5. "content-refresher" — node scripts/content-refresher.js --ai (refreshes stale posts)
6. "affiliate-linker" — node scripts/affiliate-linker.js <file> (adds affiliate links)
7. "fix-broken-links" — node scripts/fix-broken-links.js (removes broken internal links)
8. "queue-refill" — trigger queue-refill.yml GitHub workflow
9. "content-performance" — node scripts/content-performance-agent.js --fix (analyzes and improves)
10. "humanize-posts" — node scripts/humanize-post.js <slug> (removes AI patterns)

Return a JSON array of 3-7 actions ordered by priority. Each action:
{
  "action": "script-name",
  "args": ["--ai", "--fix"] or null,
  "priority": 1-10 (1 = highest),
  "reason": "why this action is needed now",
  "expectedImpact": "what will improve"
}`;

  return groqJson(prompt, { temperature: 0.3, maxTokens: 2048 });
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

  if (!hasGroqKey()) {
    console.log('❌ GROQ_API_KEY required for auto-pilot.');
    process.exit(1);
  }

  const startTime = Date.now();

  // Scan site state
  console.log('📊 Scanning site state...');
  const state = scanSiteState();
  console.log(`   Posts: ${state.totalPosts} | Weak SEO: ${state.weakSeoCount} | Stale: ${state.oldPosts} | Thin: ${state.thinContent}`);
  console.log(`   Missing excerpts: ${state.missingExcerpt} | Queue: ${state.queueSize} | Internal links: ${state.totalInternalLinks}\n`);

  // If single script requested, run it directly
  if (singleScript) {
    console.log(`🎯 Running single script: ${singleScript}\n`);
    const result = runScript(`${singleScript}.js`, ['--ai', '--fix']);
    const summary = {
      timestamp: new Date().toISOString(),
      mode: 'single',
      script: singleScript,
      state: scanSiteState(),
      plan: [{ action: singleScript, priority: 1, reason: 'User-requested' }],
      results: [{ action: singleScript, ...result }],
      duration: Date.now() - startTime,
    };
    saveHistory(summary);
    console.log(result.success ? `✅ ${singleScript} completed` : `❌ ${singleScript} failed: ${result.error || result.output}`);
    console.log(`\n📊 Duration: ${(Date.now() - startTime) / 1000}s`);
    process.exit(result.success ? 0 : 1);
  }

  // AI planning
  console.log('🧠 AI planning optimal execution sequence...');
  const plan = await aiPlan(state);
  if (!plan || !Array.isArray(plan) || plan.length === 0) {
    console.log('❌ AI failed to generate a plan.');
    process.exit(1);
  }

  plan.sort((a, b) => (a.priority || 99) - (b.priority || 99));
  console.log(`\n📋 Execution plan (${plan.length} steps):`);
  for (const step of plan) {
    console.log(`   ${step.priority}. ${step.action} — ${step.reason}`);
  }

  // Execute plan
  console.log('\n' + '='.repeat(50));
  console.log('🚀 EXECUTING PLAN\n');
  const results = [];
  let allSuccess = true;

  for (const step of plan) {
    console.log(`▶️ [${step.priority}] ${step.action}${step.args ? ' ' + step.args.join(' ') : ''}`);
    console.log(`   Reason: ${step.reason}`);

    const result = runScript(`${step.action}.js`, step.args || []);
    results.push({ action: step.action, ...result });

    if (result.success) {
      const lines = result.output.split('\n').filter(l => l.trim());
      const lastLine = lines[lines.length - 1] || '';
      console.log(`   ✅ ${lastLine.slice(0, 100)}`);
    } else {
      console.log(`   ❌ ${result.error?.slice(0, 200) || 'Unknown error'}`);
      if (!fullCycle) {
        console.log('   ⏭ Stopping (use --full to continue on failure)');
        allSuccess = false;
        break;
      }
    }
    console.log('');
  }

  const duration = Date.now() - startTime;
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  // Save to history
  const entry = {
    timestamp: new Date().toISOString(),
    mode: fullCycle ? 'full' : 'smart',
    state,
    plan,
    results,
    successCount,
    failCount,
    duration,
    allSuccess,
  };
  saveHistory(entry);

  // Summary
  console.log('='.repeat(50));
  console.log('📊 AUTO-PILOT SUMMARY');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   ⏱ Duration: ${(duration / 1000).toFixed(1)}s`);
  console.log(`   📁 Log: ${LOG_FILE}`);

  const updated = scanSiteState();
  console.log(`\n📈 Site changes:`);
  if (updated.weakSeoCount !== state.weakSeoCount) console.log(`   SEO weak: ${state.weakSeoCount} → ${updated.weakSeoCount}`);
  if (updated.thinContent !== state.thinContent) console.log(`   Thin content: ${state.thinContent} → ${updated.thinContent}`);
  if (updated.totalInternalLinks !== state.totalInternalLinks) console.log(`   Internal links: ${state.totalInternalLinks} → ${updated.totalInternalLinks}`);
  if (updated.missingExcerpt !== state.missingExcerpt) console.log(`   Missing excerpts: ${state.missingExcerpt} → ${updated.missingExcerpt}`);

  process.exit(allSuccess ? 0 : 1);
})();

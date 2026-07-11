import { groqGenerate } from '@/lib/groq';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const GITHUB_TOKEN = process.env.GITHUB_API_TOKEN;
const REPO = 'Ansygroup/ai-blog';

function getAutoPilotHistory() {
  const logPath = path.join(process.cwd(), 'public', 'auto-pilot', 'history.json');
  if (!fs.existsSync(logPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(logPath, 'utf8')).slice(0, 10);
  } catch {
    return [];
  }
}

const AGENTS = [
  { id: 'agent-supervisor', name: 'Supervisor Agent', category: 'generation', desc: 'Main content generation — batch article creation with quality gating', emoji: '🧠', workflow: 'agent-supervisor.yml', schedule: 'Every 4h', tier: 'core' },
  { id: 'intelligence-loop', name: 'Intelligence Loop', category: 'generation', desc: 'Self-improvement cycle: strategy → SEO → refresh → generate → link', emoji: '🔄', workflow: 'intelligence-loop.yml', schedule: 'Daily 6am', tier: 'core' },
  { id: 'scheduled-content', name: 'Scheduled Content', category: 'generation', desc: 'Hourly post generation from keyword queue', emoji: '⏰', workflow: 'scheduled-content.yml', schedule: 'Every hour', tier: 'core' },
  { id: 'queue-refill', name: 'Queue Refill', category: 'generation', desc: 'Keep keyword queue stocked with AI-generated topics', emoji: '📥', workflow: 'queue-refill.yml', schedule: 'Every 6h', tier: 'support' },
  { id: 'editor-agent', name: 'Editor Agent', category: 'quality', desc: 'PR content quality review — frontmatter, length, structure', emoji: '📝', workflow: 'editor-agent.yml', schedule: 'On PR', tier: 'core' },
  { id: 'seo-audit', name: 'SEO Audit', category: 'quality', desc: 'Automated SEO checks on all posts', emoji: '🔍', workflow: 'seo-audit.yml', schedule: 'On PR', tier: 'core' },
  { id: 'geo-agent', name: 'GEO Agent', category: 'quality', desc: 'AI engine optimization — Quick Answers, key takeaways', emoji: '🌐', workflow: 'geo-agent.yml', schedule: 'Weekly Sat', tier: 'support' },
  { id: 'humanize-posts', name: 'Humanizer', category: 'quality', desc: 'Remove AI writing patterns — natural language rewrite', emoji: '✍️', workflow: 'humanize-posts.yml', schedule: 'On generation', tier: 'support' },
  { id: 'polish-posts', name: 'Polish Agent', category: 'quality', desc: 'Formatting cleanup, excerpt expansion, bio insertion', emoji: '✨', workflow: 'polish-posts.yml', schedule: 'Manual', tier: 'support' },
  { id: 'social-agent', name: 'Social Agent', category: 'distribution', desc: 'Post to Twitter/X, LinkedIn, and Facebook via API', emoji: '📢', workflow: 'social-agent.yml', schedule: 'On publish', tier: 'core' },
  { id: 'pinterest-agent', name: 'Pinterest Agent', category: 'distribution', desc: 'Create Pinterest pins from new posts via API v5', emoji: '📌', workflow: 'pinterest-agent.yml', schedule: 'On publish', tier: 'support' },
  { id: 'newsletter-agent', name: 'Newsletter Agent', category: 'distribution', desc: 'Weekly digest compilation and sending', emoji: '📧', workflow: 'newsletter-agent.yml', schedule: 'Weekly Mon', tier: 'core' },
  { id: 'analytics-agent', name: 'Analytics Agent', category: 'intelligence', desc: 'Weekly performance review and recommendations', emoji: '📊', workflow: 'analytics-agent.yml', schedule: 'Weekly Sun', tier: 'support' },
  { id: 'content-performance', name: 'Content Performance', category: 'intelligence', desc: 'Analyze 188 posts, classify, generate Groq recommendations to boost traffic', emoji: '📈', workflow: 'content-performance.yml', schedule: 'Weekly Sun', tier: 'support' },
  { id: 'amazon-affiliate', name: 'Amazon Affiliate', category: 'monetization', desc: 'Affiliate link insertion into product posts', emoji: '🛒', workflow: 'amazon-affiliate-agent.yml', schedule: 'On publish', tier: 'support' },
  { id: 'amazon-intelligence', name: 'Amazon Intelligence', category: 'monetization', desc: 'Amazon product data scraping and analysis', emoji: '📦', workflow: 'amazon-intelligence.yml', schedule: 'Manual', tier: 'support' },
  { id: 'refresh-agent', name: 'Refresh Agent', category: 'maintenance', desc: 'Update stale posts with fresh dates', emoji: '🔄', workflow: 'refresh-agent.yml', schedule: 'Daily 4am', tier: 'support' },
  { id: 'auto-internal-link', name: 'Link Agent', category: 'maintenance', desc: 'Auto internal linking between related posts', emoji: '🔗', workflow: 'auto-internal-link.yml', schedule: 'Manual', tier: 'support' },
  { id: 'bing-trust', name: 'Bing Trust Agent', category: 'maintenance', desc: 'Bing Webmaster Tools indexing', emoji: '🔎', workflow: 'bing-trust-agent.yml', schedule: 'Manual', tier: 'support' },
  { id: 'deploy', name: 'Deploy Pipeline', category: 'infra', desc: 'Build → Vercel deploy → IndexNow submit', emoji: '🚀', workflow: 'deploy.yml', schedule: 'On push', tier: 'core' },
  { id: 'programmatic-seo', name: 'Programmatic SEO', category: 'generation', desc: 'Programmatic page generation for scaled content', emoji: '⚙️', workflow: 'programmatic-seo-agent.yml', schedule: 'Manual', tier: 'support' },
];

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    if (searchParams.get('ai-decision') === 'true') {
      // Build context for AI decision
      const postsPath = path.join(process.cwd(), 'content', 'posts');
      const postFiles = fs.existsSync(postsPath) ? fs.readdirSync(postsPath).filter(f => f.endsWith('.mdx')) : [];
      const queuePath = path.join(process.cwd(), 'scripts', 'keyword-queue.json');
      const queue = fs.existsSync(queuePath) ? JSON.parse(fs.readFileSync(queuePath, 'utf8')) : [];

      // Quick stats
      let weakSeoCount = 0;
      let oldPosts = 0;
      let noFaqCount = 0;
      const now = new Date();
      postFiles.forEach(f => {
        const c = fs.readFileSync(path.join(postsPath, f), 'utf8');
        const dateMatch = c.match(/^date:\s*(.+)/m);
        const seoMatch = c.match(/^seoScore:\s*(\d+)/m);
        if (seoMatch && parseInt(seoMatch[1]) < 70) weakSeoCount++;
        if (dateMatch) {
          const d = new Date(dateMatch[1].trim());
          if (now - d > 180 * 86400000) oldPosts++;
        }
        if (!c.includes('## FAQ')) noFaqCount++;
      });

      const agentContext = AGENTS.map(a => `${a.name} (${a.category}, ${a.schedule}, workflow: ${a.workflow})`).join('\n');

      const prompt = `You are an AI operations director for a blog. Based on these stats, recommend exactly ONE action to run next.

Site Stats:
- Total posts: ${postFiles.length}
- Posts needing SEO improvement (<70): ${weakSeoCount}
- Posts without FAQ: ${noFaqCount}
- Stale posts (>6 months): ${oldPosts}
- Queue topics: ${queue.length}

Available agents:
${agentContext}

Return a JSON object with:
1. "nextAction" — the workflow ID (filename like "seo-audit.yml") of the agent to run
2. "reason" — 1-sentence explanation of why this is the priority
3. "priority" — "high", "medium", or "low"

Rules:
- If weakSeoCount > 10 or noFaqCount > 20 → recommend "seo-optimizer.yml" (run SEO optimizer --fix)
- If queue.length < 10 → recommend "queue-refill.yml" (refill queue)
- If oldPosts > 20 → recommend "refresh-agent.yml" (refresh content)
- If weakSeoCount < 5 and queue.length > 20 and oldPosts < 10 → recommend "auto-internal-link.yml" (internal linking)
- Otherwise recommend "intelligence-loop.yml" (full improvement cycle)`;

      const aiText = await groqGenerate(prompt, { temperature: 0.3, maxTokens: 512 });
      if (aiText) {
        const cleaned = aiText.replace(/```json\s*/i, '').replace(/```\s*$/, '').trim();
        const parsed = JSON.parse(cleaned);
        return Response.json({ decision: parsed, generated: true });
      }
      return Response.json({ decision: null, generated: false });
    }

    if (!GITHUB_TOKEN) {
      return Response.json({ error: 'GitHub API token not configured' }, { status: 400 });
    }

    const runsRes = await fetch(
      `https://api.github.com/repos/${REPO}/actions/runs?per_page=200&page=1`,
      { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'ai-blog-dashboard' } }
    );

    if (!runsRes.ok) {
      return Response.json({ error: `GitHub API error: ${runsRes.status}` }, { status: 502 });
    }

    const runsData = await runsRes.json();
    const runs = runsData.workflow_runs || [];

    const latestByWorkflow = {};
    for (const run of runs) {
      const path = run.path || '';
      const name = path.split('/').pop();
      if (!latestByWorkflow[name] || new Date(run.created_at) > new Date(latestByWorkflow[name].created_at)) {
        latestByWorkflow[name] = {
          status: run.status,
          conclusion: run.conclusion,
          created_at: run.created_at,
          updated_at: run.updated_at,
          html_url: run.html_url,
          event: run.event,
          head_branch: run.head_branch,
          run_number: run.run_number,
        };
      }
    }

    const agentsWithStatus = AGENTS.map((agent) => {
      const latest = latestByWorkflow[agent.workflow];
      return {
        ...agent,
        status: latest?.status || 'unknown',
        conclusion: latest?.conclusion || null,
        lastRun: latest?.created_at || null,
        lastResult: latest?.updated_at || null,
        runUrl: latest?.html_url || null,
        runNumber: latest?.run_number || null,
        event: latest?.event || null,
      };
    });

    const totalRuns = runs.length;
    const successRuns = runs.filter(r => r.conclusion === 'success').length;
    const failRuns = runs.filter(r => r.conclusion === 'failure').length;
    const inProgress = runs.filter(r => r.status === 'in_progress').length;

    const autoPilotHistory = getAutoPilotHistory();

    // Aggregate site-wide stats for summary widgets
    const postsDir = path.join(process.cwd(), 'content', 'posts');
    const postFiles = fs.existsSync(postsDir) ? fs.readdirSync(postsDir).filter(f => f.endsWith('.mdx')) : [];
    let staleCount = 0; let missingInternalCount = 0; let excerptIssues = 0; let weakSeoCount = 0;
    const now = new Date();
    postFiles.forEach(f => {
      const c = fs.readFileSync(path.join(postsDir, f), 'utf8').replace(/\r\n/g, '\n');
      const body = c.split('---').slice(2).join('---');
      const fm = c.match(/^---\n([\s\S]*?)\n---/);
      if (!fm) return;
      const get = (k) => { const r = new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm'); const m = fm[1].match(r); return m ? m[1].trim() : ''; };
      const date = get('date');
      const seo = parseInt(get('seoScore'));
      const lastUpd = get('lastUpdated') || date;
      const excerpt = get('excerpt');
      if (lastUpd && now - new Date(lastUpd) > 180 * 86400000) staleCount++;
      if (seo && seo < 70) weakSeoCount++;
      if (excerpt && (excerpt.length < 120 || excerpt.length > 160)) excerptIssues++;
      if (!body.match(/\[.*?\]\(\/(?!\/)/)) missingInternalCount++;
    });

    const queuePath = path.join(process.cwd(), 'scripts', 'keyword-queue.json');
    const queue = fs.existsSync(queuePath) ? JSON.parse(fs.readFileSync(queuePath, 'utf8')) : [];
    const schedulePath = path.join(process.cwd(), 'public', 'data', 'social-schedule.json');
    let pendingSocial = 0;
    if (fs.existsSync(schedulePath)) {
      try {
        const sched = JSON.parse(fs.readFileSync(schedulePath, 'utf8'));
        pendingSocial = sched.filter(s => s.status === 'pending').length;
      } catch {}
    }

    return Response.json({
      agents: agentsWithStatus,
      system: {
        totalRuns,
        successRuns,
        failRuns,
        inProgress,
        uptime: totalRuns ? Math.round((successRuns / totalRuns) * 100) : 100,
      },
      widgets: {
        totalPosts: postFiles.length,
        stalePosts: staleCount,
        weakSeo: weakSeoCount,
        excerptIssues,
        missingInternalLinks: missingInternalCount,
        queueSize: queue.length,
        pendingSocial,
      },
      autoPilotHistory,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { workflowId, inputs } = await req.json();
    if (!workflowId) {
      return Response.json({ error: 'workflowId required' }, { status: 400 });
    }

    const res = await fetch(
      `https://api.github.com/repos/${REPO}/actions/workflows/${workflowId}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent': 'ai-blog-dashboard',
        },
        body: JSON.stringify({ ref: 'main', inputs: inputs || {} }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: `GitHub API error: ${res.status}` }, { status: 502 });
    }

    return Response.json({ success: true, workflow: workflowId });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

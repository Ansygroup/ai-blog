export const dynamic = 'force-dynamic';

const GITHUB_TOKEN = process.env.GITHUB_API_TOKEN;
const REPO = 'Ansygroup/ai-blog';

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
  { id: 'social-agent', name: 'Social Agent', category: 'distribution', desc: 'Share new posts on social media platforms', emoji: '📢', workflow: 'social-agent.yml', schedule: 'On publish', tier: 'core' },
  { id: 'pinterest-agent', name: 'Pinterest Agent', category: 'distribution', desc: 'Auto pin generation for new content', emoji: '📌', workflow: 'pinterest-agent.yml', schedule: 'On publish', tier: 'support' },
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

export async function GET() {
  try {
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

    return Response.json({
      agents: agentsWithStatus,
      system: {
        totalRuns,
        successRuns,
        failRuns,
        inProgress,
        uptime: totalRuns ? Math.round((successRuns / totalRuns) * 100) : 100,
      },
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

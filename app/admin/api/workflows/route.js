import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const GITHUB_TOKEN = process.env.GITHUB_API_TOKEN;
const REPO = 'Ansygroup/ai-blog';

const WORKFLOW_NAMES = {
  'scheduled-content.yml': 'Generate Posts',
  'polish-posts.yml': 'Polish Posts',
  'seo-audit.yml': 'SEO Audit',
  'auto-internal-link.yml': 'Auto Internal Links',
  'refresh-agent.yml': 'Refresh Content',
  'humanize-posts.yml': 'Humanize Posts',
  'social-agent.yml': 'Social Posts',
  'pinterest-agent.yml': 'Create Pins',
};

export async function GET() {
  try {
    if (!GITHUB_TOKEN) {
      return Response.json({ error: 'GitHub token not configured', runs: [] });
    }

    const [runsRes, wfRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${REPO}/actions/runs?per_page=30&page=1`, {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'ai-blog' },
      }),
      fetch(`https://api.github.com/repos/${REPO}/actions/workflows`, {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'ai-blog' },
      }),
    ]);

    if (!runsRes.ok) {
      return Response.json({ error: `GitHub API: ${runsRes.status}`, runs: [] });
    }

    const runsData = await runsRes.json();
    const wfData = await wfRes.json();

    const workflows = {};
    (wfData.workflows || []).forEach(w => {
      workflows[w.id] = { name: w.name, path: w.path.split('/').pop(), state: w.state };
    });

    const runs = (runsData.workflow_runs || []).map(r => ({
      id: r.id,
      name: r.display_title || WORKFLOW_NAMES[r.workflow_id] || workflows[r.workflow_id]?.name || r.name || 'Unknown',
      workflowId: r.workflow_id,
      status: r.status,
      conclusion: r.conclusion,
      branch: r.head_branch,
      created: r.created_at,
      updated: r.updated_at,
      htmlUrl: r.html_url,
      actor: r.actor?.login || 'unknown',
      trigger: r.event,
    }));

    return Response.json({ runs, total: runsData.total_count, workflows });
  } catch (err) {
    return Response.json({ error: err.message, runs: [] });
  }
}

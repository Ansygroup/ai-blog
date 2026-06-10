export const dynamic = 'force-dynamic';

const GITHUB_TOKEN = process.env.GITHUB_API_TOKEN;
const REPO = 'Ansygroup/ai-blog';

const workflows = {
  generate: { workflow_id: 'scheduled-content.yml', inputs: {} },
  polish: { workflow_id: 'polish-posts.yml', inputs: {} },
  seo: { workflow_id: 'seo-audit.yml', inputs: {} },
  links: { workflow_id: 'auto-internal-link.yml', inputs: {} },
  refresh: { workflow_id: 'refresh-agent.yml', inputs: {} },
};

export async function GET() {
  return Response.json({ actions: Object.keys(workflows) });
}

export async function POST(req) {
  try {
    if (!GITHUB_TOKEN) {
      return Response.json({ error: 'GitHub API token not configured' }, { status: 400 });
    }

    const { action, inputs } = await req.json();
    const config = workflows[action];

    if (!config) {
      return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const mergedInputs = { ...config.inputs, ...inputs };

    const res = await fetch(
      `https://api.github.com/repos/${REPO}/actions/workflows/${config.workflow_id}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent': 'ai-blog-dashboard',
        },
        body: JSON.stringify({ ref: 'main', inputs: mergedInputs }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: `GitHub API error: ${res.status} — ${err}` }, { status: 502 });
    }

    return Response.json({ success: true, action });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

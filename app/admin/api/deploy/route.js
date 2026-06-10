export const dynamic = 'force-dynamic';

const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN;
const TEAM_ID = 'team_jsDd0T7iHZ26E6GhomgOxE4T';
const PROJECT_ID = 'prj_rsovAri2OEbo6Q3FSWHyk3Jzjtx2';

export async function GET() {
  try {
    if (!VERCEL_TOKEN) {
      return Response.json({ error: 'Vercel API token not configured' }, { status: 400 });
    }

    const res = await fetch(
      `https://api.vercel.com/v1/deployments?projectId=${PROJECT_ID}&teamId=${TEAM_ID}&limit=10`,
      { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
    );

    if (!res.ok) {
      return Response.json({ error: `Vercel API error: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    return Response.json({
      deployments: (data.deployments || []).map((d) => ({
        uid: d.uid,
        url: d.url,
        readyState: d.readyState,
        createdAt: d.created,
        target: d.target || 'preview',
        inspectorUrl: d.inspectorUrl,
      })),
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    if (!VERCEL_TOKEN) {
      return Response.json({ error: 'Vercel API token not configured' }, { status: 400 });
    }

    const res = await fetch(
      `https://api.vercel.com/v1/deployments?projectId=${PROJECT_ID}&teamId=${TEAM_ID}&forceNew=1`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'ai-blog', projectId: PROJECT_ID, target: 'production' }),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      return Response.json({ error: data.error?.message || 'Deploy failed' }, { status: 502 });
    }

    return Response.json({
      success: true,
      deployment: { uid: data.uid, url: data.url, readyState: data.readyState },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

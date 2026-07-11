import { groqGenerate, groqJson } from '@/lib/groq';
import { getAllPosts } from '@/lib/posts';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const GITHUB_TOKEN = process.env.GITHUB_API_TOKEN;
const REPO = 'Ansygroup/ai-blog';

const AGENTS = [
  { name: 'Supervisor Agent', workflow: 'agent-supervisor.yml', category: 'generation' },
  { name: 'Intelligence Loop', workflow: 'intelligence-loop.yml', category: 'generation' },
  { name: 'Scheduled Content', workflow: 'scheduled-content.yml', category: 'generation' },
  { name: 'Queue Refill', workflow: 'queue-refill.yml', category: 'generation' },
  { name: 'Editor Agent', workflow: 'editor-agent.yml', category: 'quality' },
  { name: 'SEO Audit', workflow: 'seo-audit.yml', category: 'quality' },
  { name: 'Humanizer', workflow: 'humanize-posts.yml', category: 'quality' },
  { name: 'Polish Agent', workflow: 'polish-posts.yml', category: 'quality' },
  { name: 'Auto-Pilot', workflow: 'auto-pilot.yml', category: 'intelligence' },
  { name: 'Link Agent', workflow: 'auto-internal-link.yml', category: 'maintenance' },
  { name: 'Refresh Agent', workflow: 'refresh-agent.yml', category: 'maintenance' },
  { name: 'Content Performance', workflow: 'content-performance.yml', category: 'intelligence' },
];

async function triggerWorkflow(workflowId, inputs = {}) {
  if (!GITHUB_TOKEN) return { error: 'GitHub API token not configured' };
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${workflowId}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ai-blog-dashboard',
      },
      body: JSON.stringify({ ref: 'main', inputs }),
    }
  );
  if (!res.ok) return { error: `GitHub API: ${res.status}` };
  return { success: true };
}

async function detectIntent(message, agentsList) {
  const agentNames = agentsList.map(a => a.name).join(', ');
  const prompt = `The user said: "${message}"

Available agents: ${agentNames}

Does the user want to run an agent? If yes, respond with JSON:
{"intent": "run_agent", "agentName": "exact agent name from list", "inputs": {}}

If the user is just asking a question, respond with:
{"intent": "question"}

Return only valid JSON.`;
  return groqJson(prompt, { temperature: 0.1, maxTokens: 256 });
}

export async function POST(req) {
  try {
    const { message } = await req.json();
    if (!message || !message.trim()) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    const posts = getAllPosts({ includeDrafts: true });
    const queuePath = path.join(process.cwd(), 'scripts', 'keyword-queue.json');
    const queue = fs.existsSync(queuePath) ? JSON.parse(fs.readFileSync(queuePath, 'utf8')) : [];

    const autoPilotPath = path.join(process.cwd(), 'public', 'auto-pilot', 'history.json');
    const autoPilotHistory = fs.existsSync(autoPilotPath) ? JSON.parse(fs.readFileSync(autoPilotPath, 'utf8')).slice(0, 3) : [];

    const scores = posts.map(p => p.seoScore).filter(Boolean);
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 'N/A';
    const weakSeoCount = posts.filter(p => p.seoScore && p.seoScore < 70).length;

    const categories = {};
    posts.forEach(p => { const c = p.category || 'Unknown'; categories[c] = (categories[c] || 0) + 1; });
    const topCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const recentPosts = posts.slice(0, 5).map(p => `- "${p.title}" (${p.category}, SEO: ${p.seoScore || 'N/A'})`).join('\n');
    const historyStr = autoPilotHistory.map(e => `- ${e.timestamp}: ${e.mode} run, ${e.successCount}/${e.failCount+e.successCount} steps`).join('\n');

    const systemContext = `You are an AI assistant for a blog admin dashboard called "AI Pulse Daily". You can answer questions AND run agents.

Site Stats:
- Total posts: ${posts.length}
- Published: ${posts.filter(p => !p.draft).length}
- Categories: ${topCategories.map(([c, n]) => `${c} (${n})`).join(', ')}
- Avg SEO score: ${avgScore}
- Weak SEO (<70): ${weakSeoCount}
- Queue topics: ${queue.length}
- Recent posts:\n${recentPosts}

Available agents: ${AGENTS.map(a => `${a.name} (${a.category})`).join(', ')}

Auto-Pilot history:\n${historyStr || 'No runs yet'}

When the user asks to run an agent, respond with: "Running [agent name]..." and I'll trigger it.
Answer concisely and helpfully. If the user asks about recommendations, suggest specific actions.`;

    const intent = await detectIntent(message, AGENTS);

    if (intent?.intent === 'run_agent' && intent?.agentName) {
      const agent = AGENTS.find(a => a.name.toLowerCase() === intent.agentName.toLowerCase());
      if (agent) {
        const result = await triggerWorkflow(agent.workflow, intent.inputs || {});
        if (result.success) {
          return Response.json({ reply: `✅ **${agent.name}** triggered successfully! Check Mission Control for status.`, source: 'action' });
        }
        return Response.json({ reply: `❌ Failed to trigger ${agent.name}: ${result.error}`, source: 'error' });
      }
    }

    const result = await groqGenerate(`${systemContext}\n\nUser question: ${message}`, {
      temperature: 0.5,
      maxTokens: 1024,
      model: 'qwen/qwen3-32b',
    });

    if (!result) {
      return Response.json({ reply: "I couldn't generate a response right now. The AI service may be unavailable.", source: 'error' });
    }

    return Response.json({ reply: result.trim(), source: 'groq' });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

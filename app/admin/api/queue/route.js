import { getAllPosts } from '@/lib/posts';
import { groqJson } from '@/lib/groq';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const queuePath = path.join(process.cwd(), 'scripts', 'keyword-queue.json');

function getQueue() {
  if (!fs.existsSync(queuePath)) return [];
  return JSON.parse(fs.readFileSync(queuePath, 'utf8'));
}

function saveQueue(queue) {
  fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2), 'utf8');
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    if (searchParams.get('prioritize') === 'true') {
      const queue = getQueue();
      const posts = getAllPosts({ includeDrafts: true });

      const existingTopics = posts.map(p => p.title?.toLowerCase() || '').join(' | ');

      const aiResult = await groqJson(`You are a content queue analyst. Prioritize these topics for an AI tools blog.

Existing site topics: ${existingTopics.slice(0, 500)}

Queue:
${queue.slice(0, 30).map((item, i) => `${i + 1}. "${item.topic}" (${item.category || 'Uncategorized'})`).join('\n')}

Rank each by traffic potential (high/medium/low) and give a 1-sentence reason. Return a JSON array of objects with: "topic" (exact match), "priority" (high/medium/low), "reason".

Focus on: search volume potential, competition level on this site, timeliness (2026 trends), affiliate/review potential.`);

      if (aiResult && Array.isArray(aiResult)) {
        const prioritized = queue.map(item => {
          const ai = aiResult.find(a => a.topic === item.topic);
          return { ...item, aiPriority: ai?.priority || 'medium', aiReason: ai?.reason || '' };
        });

        const order = { high: 0, medium: 1, low: 2 };
        prioritized.sort((a, b) => (order[a.aiPriority] || 1) - (order[b.aiPriority] || 1));

        return Response.json({
          topics: prioritized,
          total: queue.length,
          aiPrioritized: true,
        });
      }

      // Fallback: return normal
      const categories = {};
      queue.forEach((item) => {
        const cat = item.category || 'Uncategorized';
        categories[cat] = (categories[cat] || 0) + 1;
      });
      return Response.json({ topics: queue, total: queue.length, categories, postsGenerated: posts.length, aiPrioritized: false });
    }

    const queue = getQueue();
    const posts = getAllPosts({ includeDrafts: true });
    const categories = {};
    queue.forEach((item) => {
      const cat = item.category || 'Uncategorized';
      categories[cat] = (categories[cat] || 0) + 1;
    });

    return Response.json({
      topics: queue,
      total: queue.length,
      categories,
      postsGenerated: posts.length,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (!body.topic || !body.topic.trim()) {
      return Response.json({ error: 'Topic is required' }, { status: 400 });
    }

    const queue = getQueue();
    const newItem = {
      topic: body.topic.trim(),
      category: body.category || 'AI News',
      keywords: Array.isArray(body.keywords) ? body.keywords : [],
    };
    queue.unshift(newItem);
    saveQueue(queue);

    return Response.json({ success: true, total: queue.length });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { topic } = await req.json();
    if (!topic) {
      return Response.json({ error: 'Topic is required' }, { status: 400 });
    }

    const queue = getQueue();
    const filtered = queue.filter((item) => item.topic !== topic);
    if (filtered.length === queue.length) {
      return Response.json({ error: 'Topic not found' }, { status: 404 });
    }

    saveQueue(filtered);
    return Response.json({ success: true, total: filtered.length });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

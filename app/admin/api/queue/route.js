import { getAllPosts } from '@/lib/posts';
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

export async function GET() {
  try {
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

// Renders the exact prompt generateSuggestions() builds, WITHOUT calling any API,
// so we can prove the 413 (payload-too-large) fix actually shrank the body.
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.argv[2] || '.');
const POSTS_DIR = path.join(ROOT, 'content', 'posts');

function readPosts() {
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.mdx'));
  const posts = [];
  for (const f of files) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8');
    const lines = raw.split('\n');
    let title = f.replace(/\.mdx$/, '').replace(/-/g, ' ');
    for (const l of lines.slice(0, 20)) {
      const m = l.match(/^title:\s*["']?(.*?)["']?\s*$/);
      if (m) { title = m[1]; break; }
    }
    posts.push({ title });
  }
  return posts;
}

const posts = readPosts();
const queue = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'keyword-queue.json'), 'utf8'));

// Mirror of the NEW capped logic.
const existingTopics = posts.map((p) => p.title);
const PROMPT_TITLE_CAP = 120;
const promptTitles = existingTopics.slice(0, PROMPT_TITLE_CAP);
const queuedTopics = queue.map((q) => q.topic);

const promptNew = `You are a content strategy expert for an AI tools review blog.

EXISTING POSTS (${posts.length} total, showing the ${promptTitles.length} most recent;
do NOT re-propose anything resembling these):
${promptTitles.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}

CURRENT QUEUE (${queuedTopics.length} topics):
${queuedTopics.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}

${'' ? `REAL SEARCH RESULTS FROM GOOGLE (use these for data-driven insights):\n${'x'.repeat(6000)}\n` : ''}

Analyze the gaps and suggest 8-12 NEW high-intent AI niche topics that:
1. Are NOT already covered by existing posts or in the queue
Return ONLY a JSON array of objects, each with: topic, category, keywords[]`;

// Mirror of the OLD uncapped logic, plus a worst-case Apify dump.
const oldPrompt = `EXISTING POSTS (${posts.length} total):
${existingTopics.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}

CURRENT QUEUE (${queuedTopics.length} topics):
${queuedTopics.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}

${`REAL SEARCH RESULTS FROM GOOGLE:\n${'x'.repeat(6000)}\n`}

Analyze the gaps and suggest 8-12 NEW high-intent AI niche topics that:
1. Are NOT already covered by existing posts or in the queue
Return ONLY a JSON array of objects, each with: topic, category, keywords[]`;

const body = (p) => JSON.stringify({ model: 'openai/gpt-oss-120b', messages: [{ role: 'system', content: 'You are a content strategy expert. Return ONLY valid JSON.' }, { role: 'user', content: p }], temperature: 0.7, max_tokens: 2000 });

const oldBytes = Buffer.byteLength(body(oldPrompt), 'utf8');
const newBytes = Buffer.byteLength(body(promptNew), 'utf8');

console.log(`posts on disk            : ${posts.length}`);
console.log(`queue size               : ${queuedTopics.length}`);
console.log(`OLD body bytes (uncapped): ${oldBytes}  (${(oldBytes / 1024).toFixed(1)} KB)`);
console.log(`NEW body bytes (capped)  : ${newBytes}  (${(newBytes / 1024).toFixed(1)} KB)`);
console.log(`reduction                : ${(100 - (newBytes / oldBytes) * 100).toFixed(1)}%`);
console.log(`titles still sent        : ${promptTitles.length} of ${existingTopics.length}`);

// gpt-oss-120b on the free tier is gated around 8k tokens for request bodies.
const approxTokens = Math.round(newBytes / 4);
console.log(`approx prompt tokens     : ${approxTokens}`);
console.log(approxTokens < 8000 ? 'VERDICT: under the 8k gate' : 'VERDICT: STILL TOO LARGE');
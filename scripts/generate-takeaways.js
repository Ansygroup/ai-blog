const fs = require('fs');
const path = require('path');

const postsDir = path.join(process.cwd(), 'content', 'posts');
const outputDir = path.join(process.cwd(), 'public', 'data');
const outputFile = path.join(outputDir, 'takeaways.json');

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';

function getGroqKey() {
  return process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_2 || '';
}

async function groqGenerate(prompt) {
  const key = getGroqKey();
  if (!key) return null;
  try {
    const res = await fetch(GROQ_API, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen/qwen3-32b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 512,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch { return null; }
}

function extractContent(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
    const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) return null;
    const frontmatter = {};
    match[1].split('\n').forEach(line => {
      const m = line.match(/^(\w+):\s*(.+)/);
      if (m) frontmatter[m[1]] = m[2].replace(/^"|"$/g, '').replace(/\\"/g, '"');
    });
    const content = match[2].trim();
    return { ...frontmatter, content };
  } catch { return null; }
}

async function main() {
  if (!getGroqKey()) {
    console.log('No Groq API key found. Generating rule-based takeaways.');
  }

  const files = fs.readdirSync(postsDir).filter(f => /\.mdx?$/.test(f));
  const existing = {};
  if (fs.existsSync(outputFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
      Object.assign(existing, parsed);
    } catch {}
  }

  const takeaways = {};
  let newCount = 0;

  for (const file of files) {
    try {
      const slug = file.replace(/\.mdx?$/, '');
      if (existing[slug]) { takeaways[slug] = existing[slug]; continue; }

      const post = extractContent(path.join(postsDir, file));
      if (!post || !post.content) continue;

      const prompt = `Summarize this blog post in exactly 3-5 concise bullet points as key takeaways. Each point should be one sentence. Focus on actionable insights and main conclusions. Return as a JSON array of strings.\n\nTitle: "${post.title}"\nContent: ${post.content.slice(0, 2000)}`;

      let points = null;
      const aiText = await groqGenerate(prompt + '\n\nRespond with valid JSON array only.');
      
      if (aiText) {
        try {
          const cleaned = aiText.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed) && parsed.length >= 2) points = parsed.slice(0, 5);
        } catch {}
      }

      if (!points) {
        // Try to extract from "Key Takeaways" section first
        const ktMatch = post.content.match(/Key\s*Takeaways\n-+\n([\s\S]*?)(?=\n##\s|\n#\s|$)/i)
          || post.content.match(/##\s*Key\s*Takeaways[\s\S]*?\n((?:- .+\n?)+)/);
        if (ktMatch) {
          const bullets = ktMatch[1].split('\n').filter(l => l.trim().startsWith('- ')).map(l => l.replace(/^-\s*/, '').trim()).filter(Boolean);
          if (bullets.length >= 2) {
            points = bullets.slice(0, 5);
          }
        }
      }

      if (!points) {
        const sentences = post.content.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').match(/[^.!?]+[.!?]+/g) || [];
        const firstSentences = sentences.slice(0, 3).map(s => s.trim()).filter(s => s.length > 20);
        points = firstSentences.length >= 2 ? firstSentences : ['Read the full article for detailed insights.'];
      }

      takeaways[slug] = { title: post.title, points };
      newCount++;
      process.stdout.write(`\rGenerated: ${newCount}/${files.length} (${slug.slice(0, 30)})        `);
    } catch (err) {
      process.stdout.write(`\nError on ${file}: ${err.message.slice(0, 100)}\n`);
    }
  }

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(takeaways, null, 2));
  console.log(`\nDone! Generated takeaways for ${Object.keys(takeaways).length} posts (${newCount} new).`);
}

main().catch(console.error);

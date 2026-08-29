#!/usr/bin/env node
/**
 * One-off: expand posts under 500 words using Gemini (free tier).
 * Quality-first: each expansion is generated per-post, specific to the
 * topic, inserted before the final section. Rate-limited to stay under
 * Gemini free tier (15 req/min).
 *
 * Usage:
 *   node scripts/expand-thin-once.js --dry-run        # list targets only
 *   node scripts/expand-thin-once.js --limit 1        # test on one post
 *   node scripts/expand-thin-once.js                  # expand all
 */
const fs = require('fs');
const path = require('path');
const { groqGenerate, hasGroqKey, geminiGenerate, hasGeminiKey } = require('./ai-agent');

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const MIN_WORDS = 500;
const TARGET_WORDS = 700;
const SLEEP_MS = 4500; // 15 req/min free tier
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 0;

const apiKey = process.env.GEMINI_API_KEY;
// Provider-agnostic: Groq first (CI secret), Gemini fallback (local).
if (!dryRun && !hasGroqKey() && !hasGeminiKey()) {
  console.error('No GROQ_API_KEY or GEMINI_API_KEY set');
  process.exit(1);
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

const MODELS = (process.env.GEMINI_MODELS || 'gemini-flash-latest,gemini-flash-lite-latest,gemini-2.0-flash,gemini-1.5-flash').split(',');

async function geminiOnce(model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.6, maxOutputTokens: 2048 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${model} ${res.status}: ${(await res.text()).slice(0, 120)}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

// CI keeps Groq keys in the Supabase groq_keys table (rotated by
// GroqClient) — env secrets may be empty. Fetch them via REST.
async function fetchSupabaseGroqKeys() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return [];
  try {
    const res = await fetch(`${url}/rest/v1/groq_keys?is_active=eq.true&select=key_value`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return [];
    return (await res.json()).map((r) => r.key_value).filter(Boolean);
  } catch {
    return [];
  }
}

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';
// qwen/qwen3-32b (groq-client default) 404s now; rotate current models.
const GROQ_MODELS = [
  process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
];

async function groqOnce(key, prompt, model) {
  const res = await fetch(GROQ_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
      max_tokens: 2048,
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 120)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

async function gemini(prompt) {
  const keys = [
    ...[process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_2, process.env.GROQ_API_KEY_3,
      process.env.GROQ_API_KEY_4, process.env.GROQ_API_KEY_5].filter(Boolean),
    ...(await fetchSupabaseGroqKeys()),
  ];
  for (const key of keys) {
    for (const model of GROQ_MODELS) {
      try {
        const out = await groqOnce(key, prompt, model);
        if (out) return out;
      } catch (e) {
        if (/404|model/i.test(e.message)) continue; // try next model
        if (!/429|rate|quota/i.test(e.message)) {
          console.log(`  (groq key failed: ${String(e.message).slice(0, 60)})`);
          break; // bad key — next key
        }
      }
    }
  }
  let lastErr;
  if (!hasGeminiKey()) throw (lastErr || new Error('no AI provider available'));
  for (let attempt = 0; attempt < 4; attempt++) {
    const model = MODELS[attempt % MODELS.length];
    try {
      const out = await geminiOnce(model, prompt);
      if (out) return out;
      lastErr = new Error('empty response');
    } catch (e) {
      lastErr = e;
      const isRetryable = /503|429|overloaded|UNAVAILABLE/i.test(e.message);
      if (!isRetryable) throw e;
    }
    await new Promise((r) => setTimeout(r, 8000 * (attempt + 1)));
  }
  throw lastErr;
}

function splitFrontmatter(content) {
  const m = content.match(/^---\n[\s\S]*?\n---\n/);
  if (!m) return { fm: '', body: content };
  return { fm: m[0], body: content.slice(m[0].length) };
}

function getMeta(fm) {
  const get = (k) => (fm.match(new RegExp(`^${k}:\\s*"?(.*?)"?\\s*$`, 'm')) || [])[1] || '';
  return { title: get('title'), tags: get('tags'), category: get('category') };
}

function insertBeforeLastSection(body, section) {
  const idx = body.lastIndexOf('\n## ');
  if (idx === -1) return body.trimEnd() + '\n' + section;
  return body.slice(0, idx).trimEnd() + '\n' + section + '\n' + body.slice(idx + 1);
}

(async () => {
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.mdx'));
  const targets = [];
  for (const f of files) {
    const c = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8');
    const w = wordCount(c);
    if (w < MIN_WORDS) targets.push({ file: f, words: w });
  }
  targets.sort((a, b) => a.words - b.words);
  console.log(`Found ${targets.length} posts under ${MIN_WORDS} words`);

  if (dryRun) {
    targets.forEach((t) => console.log(`  ${t.words}  ${t.file}`));
    return;
  }

  const queue = limit ? targets.slice(0, limit) : targets;
  let done = 0;
  let failed = 0;

  for (const t of queue) {
    const filePath = path.join(POSTS_DIR, t.file);
    const content = fs.readFileSync(filePath, 'utf8');
    const { fm, body } = splitFrontmatter(content);
    const meta = getMeta(fm);

    try {
      const prompt = `You are expanding a short blog post about "${meta.title}" (category: ${meta.category}, tags: ${meta.tags}).

Current body:
${body.slice(0, 3000)}

Write 2 new markdown sections (300-450 words total) that add genuine value to this specific post:
- Use ## headings, specific to this exact topic — no generic filler
- Reference the actual tools/claims already in the post where relevant
- Match the post's existing tone and depth; no AI clichés ("in today's fast-paced world", "unlock", "game-changer")
- One section should be practical (steps, criteria, mistakes, or a concrete example), one can be forward-looking

Return ONLY the new markdown sections, no preamble, no code fences.`;

      const section = await gemini(prompt);
      if (!section || section.length < 200) throw new Error('empty/short response');

      const newBody = insertBeforeLastSection(body, '\n' + section.replace(/^#+\s*$/, '').trim() + '\n');
      fs.writeFileSync(filePath, fm + newBody);
      const newTotal = wordCount(fm + newBody);
      done++;
      console.log(`✅ ${t.file}: ${t.words} → ${newTotal} words`);
    } catch (e) {
      failed++;
      console.log(`❌ ${t.file}: ${e.message}`);
    }

    if (done + failed < queue.length) await new Promise((r) => setTimeout(r, SLEEP_MS));
  }

  console.log(`\nDone: ${done} expanded, ${failed} failed`);
})();

#!/usr/bin/env node
/**
 * scripts/generate-post.js
 *
 * Generates a new SEO + GEO-optimized blog post and writes it
 * to /content/posts/<slug>.mdx. The "24/7" content engine.
 *
 * ================================================================
 * SUPPORTED PROVIDERS (set AI_PROVIDER in .env.local):
 * ================================================================
 *
 *   groq           — FREE, fastest. Llama 3.3 70B (latest stable).
 *                    Sign up: https://console.groq.com/  (no card)
 *                    Get key: https://console.groq.com/keys
 *                    Model:   openai/gpt-oss-120b      (verified live, default)
 *                             openai/gpt-oss-20b       (faster, cheaper)
 *                             qwen/qwen3.8-27b         (alternative)
 *                    DECOMMISSION WARNING: Groq shut down `llama-3.3-70b-versatile`
 *                    and `llama-3.1-8b-instant` for the free/developer tier on
 *                    2026-08-16, and `qwen/qwen3-32b` before that. Any of those ids
 *                    now returns model_decommissioned/404. Check the live list with
 *                    curl -s https://api.groq.com/openai/v1/models \
 *                      -H "Authorization: Bearer $GROQ_API_KEY"
 *                    Limits:  30 req/min, ~14,400 req/day (free tier)
 *
 *   openrouter     — FREE tier with many models, single API.
 *                    Sign up: https://openrouter.ai/  (no card)
 *                    Get key: https://openrouter.ai/keys
 *                    Model:   meta-llama/llama-3.1-8b-instruct:free
 *                             qwen/qwen-2-7b-instruct:free
 *                             mistralai/mistral-7b-instruct:free
 *                    Limits:  20 req/min, 200/day (free tier)
 *
 *   gemini         — FREE tier via Google AI Studio.
 *                    Sign up: https://aistudio.google.com/app/apikey
 *                    Model:   gemini-1.5-flash   (1M context, 15 req/min)
 *                             gemini-1.5-pro     (2M context, 2 req/min)
 *                    Limits:  15 req/min, 1500/day
 *
 *   openai         — PAID. Set OPENAI_API_KEY and AI_PROVIDER=openai
 *                    to use gpt-4o-mini (cheap) or gpt-4o (best).
 *
 *   ollama         — LOCAL. Run `ollama serve` with a model pulled.
 *                    No API key needed, but you need a GPU.
 *
 * ================================================================
 * USAGE:
 *   node scripts/generate-post.js "best ai writing tools 2026"
 *   node scripts/generate-post.js --from-keywords   (drain queue)
 *   node scripts/generate-post.js --batch 5         (5 posts in a row)
 *   AI_PROVIDER=groq node scripts/generate-post.js "topic"
 *
 * After generation:
 *   1. Review the post
 *   2. Add cover image (use Unsplash or generate)
 *   3. git add content/posts/<slug>.mdx
 *   4. git commit -m "post: <title>"
 *   5. git push   (auto-deploys to Vercel + pings IndexNow)
 */
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const KEYWORD_QUEUE = path.join(__dirname, 'keyword-queue.json');
const ROOT = path.join(__dirname, '..');

if (!fs.existsSync(POSTS_DIR)) fs.mkdirSync(POSTS_DIR, { recursive: true });

// ================================================================
// Provider adapters — all return { generateText(prompt): Promise<string> }
// ================================================================

async function makeGroqProvider() {
  const primaryKey = process.env.GROQ_API_KEY;
  const fallbackKeys = [2,3,4,5].map(i => process.env[`GROQ_API_KEY_${i}`]).filter(Boolean);
  const allKeys = [primaryKey, ...fallbackKeys].filter(Boolean);
  if (!primaryKey) throw new Error('GROQ_API_KEY missing. Sign up free at https://console.groq.com/');
  const primary = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
  // NOTE: `qwen/qwen3-32b` was REMOVED here on 2026-10-03 — Groq answers
  // 404 model_not_found for it, and because it was the LAST entry in the
  // chain its 404 was the only error that ever surfaced. Every generation in
  // the chain 404'd, the batch printed "0 generated, 5 failed", and the run
  // still exited 0 — a green CI run that produced nothing.
  // `meta-llama/llama-4-scout-17b-16e-instruct` was removed the same day after
  // the first live re-test also 404'd on it. Keep this list to ids that are
  // verified live against the Groq API; an unverified id silently costs a
  // generation every time it is reached, and the LAST entry's error is all the
  // operator ever sees.
  //
  // DECOMMISSION, 2026-10-03 (the real reason generation had stopped):
  // Groq DECOMMISSIONED `llama-3.3-70b-versatile` AND `llama-3.1-8b-instant` for
  // the free/developer tier on 2026-08-16, so the entire previous chain was
  // returning model_decommissioned/404. Groq's own migration targets are
  // `openai/gpt-oss-120b`, `openai/gpt-oss-20b` and `qwen/qwen3.8-27b`.
  // VERIFY BEFORE ADDING ANY MODEL — only ids in this response are callable:
  //   curl -s https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"
  // Note gpt-oss-120b accepts reasoning_effort low|medium|high only, never "none".
  const modelFallbacks = ['openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
  const models = [primary, ...modelFallbacks.filter((m) => m !== primary)];

  const name = `groq/${primary} (${allKeys.length} keys)`;

  async function tryKey(apiKey, model, prompt, systemPrompt) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4500,
      }),
    });
    return res;
  }

  return {
    name,
    async generateText(prompt, systemPrompt) {
      let lastErr;
      for (const model of models) {
        for (let ki = 0; ki < allKeys.length; ki++) {
          for (let retry = 0; retry <= 1; retry++) {
            try {
              const res = await tryKey(allKeys[ki], model, prompt, systemPrompt);
              if (res.ok) {
                const data = await res.json();
                return data.choices?.[0]?.message?.content?.trim() || '';
              }
              const errText = await res.text();
              if (res.status === 429) {
                console.log(`   ⏳ key${ki + 1}/${model}: 429 — ${retry === 0 ? 'retrying' : 'switching'}...`);
                lastErr = new Error(`Groq ${res.status}: ${errText.slice(0, 120)}`);
                await new Promise((r) => setTimeout(r, retry === 0 ? 8000 : 2000));
                continue;
              }
              if (res.status === 413 || (res.status === 400 && /decommissioned|not supported|not found|invalid model/i.test(errText))) {
                console.log(`   ⏳ key${ki + 1}/${model}: ${res.status} — switching`);
                lastErr = new Error(`Groq ${res.status}: ${errText.slice(0, 120)}`);
                await new Promise((r) => setTimeout(r, 3000));
                break;
              }
              throw new Error(`Groq ${res.status}: ${errText.slice(0, 200)}`);
            } catch (err) {
              if (!err.message.startsWith('Groq ')) throw err;
              lastErr = err;
              break;
            }
          }
        }
      }
      throw lastErr || new Error('All Groq keys and models failed');
    },
  };
}

async function makeOpenRouterProvider() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY missing. Sign up free at https://openrouter.ai/');
  const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free';
  return {
    name: `openrouter/${model}`,
    async generateText(prompt, systemPrompt) {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://ai-blog-ten-steel.vercel.app',
          'X-Title': 'AI Pulse Daily',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 4500,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenRouter ${res.status}: ${err.slice(0, 200)}`);
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || '';
    },
  };
}

async function makeGeminiProvider() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY missing. Get a free key at https://aistudio.google.com/app/apikey');
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  return {
    name: `gemini/${model}`,
    async generateText(prompt, systemPrompt) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4500 },
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini ${res.status}: ${err.slice(0, 200)}`);
      }
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    },
  };
}

async function makeOllamaProvider() {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3.1';
  return {
    name: `ollama/${model}`,
    async generateText(prompt, systemPrompt) {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          stream: false,
          options: { temperature: 0.7, num_predict: 4500 },
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Ollama ${res.status}: ${err.slice(0, 200)}`);
      }
      const data = await res.json();
      return data.message?.content?.trim() || '';
    },
  };
}

async function makeOpenAIProvider() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY missing.');
  const OpenAI = require('openai').default || require('openai');
  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  return {
    name: `openai/${model}`,
    async generateText(prompt, systemPrompt) {
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4500,
      });
      return completion.choices[0].message.content.trim();
    },
  };
}

// resolveNvidiaKey(): the NVIDIA key lives OUTSIDE the repo so it is never committed.
// Order: .env.local (dotenv) -> NVIDIA_API_KEY env -> ~/.hermes/nvidia_api_key -> ~/.hermes/.env
function resolveNvidiaKey() {
  if (process.env.NVIDIA_API_KEY) return process.env.NVIDIA_API_KEY.trim();
  const home = process.env.HOME || process.env.USERPROFILE || '';
  try { return fs.readFileSync(path.join(home, '.hermes', 'nvidia_api_key'), 'utf8').trim() || null; } catch (e) { /* next */ }
  try {
    const txt = fs.readFileSync(path.join(home, '.hermes', '.env'), 'utf8');
    const m = txt.match(/^\s*NVIDIA_API_KEY\s*=\s*(.+)$/m);
    if (m) return m[1].replace(/^["']|["']$/g, '').trim();
  } catch (e) { /* ignore */ }
  return null;
}

// Ordered live models. NVIDIA retires model slugs (410 Gone), so the provider
// walks this list on 410/404 instead of failing the whole publish run.
// z-ai/glm-5.2 hit end-of-life 2026-08-21 — keep it last as a documented tombstone.
// VERIFIED LIVE 2026-10-05 by direct probe of all 80 listed models:
//   meta/llama-3.2-11b-vision-instruct  -> 200, 27 words of coherent prose
//   google/diffusiongemma-26b-a4b-it   -> 200, 22 words
// Everything below those two returned 404/410 or timed out on that date, and
// OpenRouter's :free slugs now 429 (free-models-per-day) / 404 (paid-only).
// A YAML frontmatter block. Trailing horizontal whitespace is tolerated on BOTH
// fences because the live NVIDIA model emits the opening fence as "--- \n"; the
// strict `/^---\r?\n/` form rejected otherwise-perfect responses (2026-10-06).
// Shared by the preamble-stripper and the write gate so they cannot drift.
const FM_BLOCK = /^---[ \t]*\r?\n([\s\S]+?)\r?\n---[ \t]*(?:\r?\n|$)/;

// Re-insert a missing closing frontmatter fence. The key block ends at the
// first line that is not a `key:` line and not part of a multi-line scalar
// continuation; anything after that is body. Returns the text unchanged when
// the model closed the fence properly.
function repairFrontmatter(text) {
  const m = /^---[ \t]*\r?\n/.exec(text);
  if (!m) return { text, fixed: false, endReason: '' };
  const afterFence = m[0].length;
  const nl = text.indexOf('\n', afterFence);
  if (nl < 0) return { text, fixed: false, endReason: '' };

  // Walk the key block line by line.
  const lines = text.slice(afterFence).split('\n');
  let end = 0;                       // index into `lines` where frontmatter ends
  let sawKey = false;
  let pendingScalar = false;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].replace(/\r$/, '');
    if (raw.trim() === '') {
      // A blank line inside a multi-line scalar is part of the VALUE, not the
      // end of the block. Only end here when we are not inside a folded scalar.
      // (Bug fixed 2026-10-06: resetting pendingScalar unconditionally truncated
      // `excerpt: >-` blocks that span a blank line.)
      if (sawKey && !pendingScalar) { end = i; break; }
      continue;
    }
    // NOTE: `raw` had its CR stripped above, so the fence pattern must NOT
    // expect a trailing `\r` -- it would never match and a valid CRLF post
    // would get a second `---` spliced in. Only horizontal whitespace may
    // trail the fence.
    if (/^---[ \t]*$/.test(raw)) { // model DID close the fence
      return { text, fixed: false, endReason: '' };
    }
    // Multi-line scalar continuations MUST be tested BEFORE the key test: an
    // indented `  spanning lines` is not a key, but if the key branch ran first
    // it would end the block and truncate the folded value (bug fixed
    // 2026-10-06 — `excerpt: >-` posts were being salvaged with a one-line
    // excerpt, silently degrading every SEO meta description).
    if (pendingScalar && /^\s+\S/.test(raw)) { end = i + 1; continue; }
    if (/^[A-Za-z_][A-Za-z0-9_-]*:/.test(raw)) {
      sawKey = true;
      // `key: >` / `key: |` opens a multi-line scalar; its indented
      // continuations are not new keys. The chomping indicator is optional and
      // COMMON: `excerpt: >-` is how these posts are written. Without `[+-]?`
      // the test failed on `>-`, `pendingScalar` stayed false, and the block
      // ended at the first indented line -- truncating every folded excerpt to
      // one line (bug fixed 2026-10-06).
      pendingScalar = /:[ \t]*[>|][+-]?[ \t]*$/.test(raw);
      end = i + 1;
      continue;
    }
    if (!sawKey) { end = i; break; } // prose before any key -> not frontmatter
    end = i;                         // heading/table/div = body starts here
    break;
  }

  if (!sawKey) return { text, fixed: false, endReason: '' };

  const keyBlock = lines.slice(0, end);
  const rest = lines.slice(end);
  const firstBody = (rest.find(l => l.trim() !== '') || [''])[0];
  // Preserve the document's own line ending: split('\n') leaves any CR on each
  // line, so re-join with '\n' and no separate EOL constant -- the CR rides
  // along with the content. Rebuilding with '\n' alone would corrupt CRLF posts.
  const rebuilt = m[0] + keyBlock.join('\n') + '\n---' + '\n' + rest.join('\n');
  return {
    text: rebuilt,
    fixed: true,
    endReason: firstBody.trim().startsWith('#') ? 'the H1' :
      firstBody.trim().startsWith('|') ? 'the first table' :
      firstBody.trim().startsWith('<') ? 'the first div' : 'the first body line',
  };
}

const NVIDIA_MODELS = [
  process.env.NVIDIA_MODEL,
  'meta/llama-3.2-11b-vision-instruct',
  'google/diffusiongemma-26b-a4b-it',
  'google/gemma-4-31b-it',
  'meta/llama-3.2-90b-vision-instruct',
  'nvidia/llama-3.3-nemotron-super-49b-v1.5',
].filter(Boolean);

async function makeNvidiaProvider() {
  const apiKey = resolveNvidiaKey();
  if (!apiKey) throw new Error('NVIDIA_API_KEY missing. Set it in .env.local, ~/.hermes/nvidia_api_key, or ~/.hermes/.env');
  let active = 0;
  const p = {
    name: `nvidia/${NVIDIA_MODELS[0]}`,
    async generateText(prompt, systemPrompt) {
      for (let attempt = 0; attempt < NVIDIA_MODELS.length; attempt++) {
        const idx = (active + attempt) % NVIDIA_MODELS.length;
        const model = NVIDIA_MODELS[idx];
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 300000); // generate-post spawn timeout is 180s; stay under it
        let res, err;
        try {
          res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            signal: ctl.signal,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt },
              ],
              temperature: 0.7,
              max_tokens: 4500,
              stream: false,
            }),
          });
        } catch (e) {
          clearTimeout(timer);
          console.log(`   ⚠️ ${model} network error (${e.name}) — trying next model`);
          continue; // timeout/abort: try the next slug
        }
        clearTimeout(timer);
        if (!res.ok) {
          const body = await res.text();
          if (res.status === 410 || res.status === 404) {
            console.log(`   ⚠️ ${model} → ${res.status} (retired/unavailable) — rotating model`);
            continue;
          }
          if (res.status === 429) {
            throw new Error(`NVIDIA 429: ${body.slice(0, 120)}`);
          }
          throw new Error(`NVIDIA ${res.status}: ${body.slice(0, 200)}`);
        }
        const data = await res.json();
        active = idx; // remember the slug that worked
        p.name = `nvidia/${model}`;
        return data.choices?.[0]?.message?.content?.trim() || '';
      }
      throw new Error(`NVIDIA: all models unavailable (${NVIDIA_MODELS.join(', ')})`);
    },
  };
  return p;
}

const PROVIDERS = {
  nvidia: makeNvidiaProvider,
  groq: makeGroqProvider,
  openrouter: makeOpenRouterProvider,
  gemini: makeGeminiProvider,
  ollama: makeOllamaProvider,
  openai: makeOpenAIProvider,
};

// Returns true when the provider's credential is actually available.
// resolveNvidiaKey() also reads ~/.hermes/.env, so process.env alone is not a valid check.
function providerHasKey(name) {
  switch (name) {
    case 'groq': return Boolean(process.env.GROQ_API_KEY);
    case 'openrouter': return Boolean(process.env.OPENROUTER_API_KEY);
    case 'gemini': return Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
    case 'nvidia': return Boolean(resolveNvidiaKey());
    case 'openai': return Boolean(process.env.OPENAI_API_KEY);
    // ollama is deliberately excluded from auto-selection: it needs a local server,
    // so silently falling back to it would just hang the run.
    case 'ollama': return false;
    default: return false;
  }
}

// Ordered preference when the requested provider has no usable key. Every free tier
// first so an unattended CI run never burns a paid key.
const FALLBACK_ORDER = ['groq', 'nvidia', 'openrouter', 'gemini', 'openai'];

async function getProvider() {
  const requested = (process.env.AI_PROVIDER || 'groq').toLowerCase();

  // Fall back on ANY requested provider whose key is missing, not just `groq`.
  // The workflows hardcode AI_PROVIDER: gemini while GEMINI_API_KEY is an empty
  // secret; the old groq-only branch left makeGeminiProvider() to throw and killed
  // the whole run even though GROQ_API_KEY was present.
  let provider = requested;
  if (!providerHasKey(requested)) {
    const fallback = FALLBACK_ORDER.find((p) => p !== requested && providerHasKey(p));
    if (fallback) {
      provider = fallback;
      console.log(`   ⚡ ${requested} requested but its key is not set — falling back to ${fallback}`);
    }
  }
  const factory = PROVIDERS[provider];
  if (!factory) {
    throw new Error(`Unknown AI_PROVIDER "${provider}". Valid: ${Object.keys(PROVIDERS).join(', ')}`);
  }
  const p = await factory();
  console.log(`🤖 Using provider: ${p.name}\n`);
  return p;
}

// ================================================================
// CLI args + topic queue
// ================================================================

const args = process.argv.slice(2);
const batchIdx = args.indexOf('--batch');
const batchSize = parseInt(args[batchIdx + 1] || '1', 10);
// The first non-flag token is the topic, but it must NOT be the --batch value
// (e.g. `--batch 5` was read as the topic "5", which generated a junk post).
// BUG (2026-10-04): when --batch is ABSENT, batchIdx === -1, so the guard
// `i !== batchIdx + 1` became `i !== 0` and skipped the FIRST argument. That
// made the documented single-topic form
//   node scripts/generate-post.js "topic here"
// ALWAYS fall through to the usage banner and exit 1 — i.e. every direct
// single-topic generation silently failed, while --from-keywords (no
// positional token) still worked. The daily loop saw "0 generated" and exited 0.
// Fix: only skip the batch value when --batch was actually supplied.
const topicArg = args.find((a, i) => !a.startsWith('--') && !(batchIdx !== -1 && i === batchIdx + 1));
const fromQueue = args.includes('--from-keywords');

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

function getTopics() {
  let queue = JSON.parse(fs.readFileSync(KEYWORD_QUEUE, 'utf8'));
  // Producers are inconsistent about the field name: competitor-scout and the
  // queue-refill path write `{ keyword, category, source, tier, ... }`, while
  // the generator and a few older entries use `{ topic, keywords, category }`.
  // Requiring `topic` alone silently DROPPED 47 of 53 entries on 2026-10-03 —
  // the run then generated from the 6 leftovers and called it normal. Normalise
  // `keyword` -> `topic` instead of discarding the work; only entries with
  // neither field are genuinely malformed (they would crash .toLowerCase()).
  const before = queue.length;
  queue = queue
    .filter((t) => t && typeof t === 'object')
    .map((t) => {
      const topic = typeof t.topic === 'string' && t.topic.trim()
        ? t.topic
        : (typeof t.keyword === 'string' && t.keyword.trim() ? t.keyword : null);
      if (!topic) return null;
      return { ...t, topic, keywords: Array.isArray(t.keywords) && t.keywords.length ? t.keywords : [topic] };
    })
    .filter(Boolean);
  if (queue.length !== before) {
    console.log(`   🧹 queue: normalised ${before} -> ${queue.length} usable entries`);
    fs.writeFileSync(KEYWORD_QUEUE, JSON.stringify(queue, null, 2));
  }
  if (fromQueue) {
    return queue.slice(0, batchSize);
  }
  // Check if topic is in queue for correct category
  const match = queue.find((t) => t.topic.toLowerCase() === topicArg.toLowerCase());
  if (match) return [match];
  return [{ topic: topicArg, keywords: [topicArg], category: 'AI Tools' }];
}

// ================================================================
// Prompts (identical regardless of provider)
// ================================================================

const SYSTEM_PROMPT = `You are a senior SEO content writer for an independent AI tools review site.
You write long-form, deeply researched, E-E-A-T-compliant articles optimized for BOTH Google search (SEO) AND AI search engines like Perplexity, ChatGPT, and Google AI Overviews (GEO = Generative Engine Optimization).

CRITICAL RULES:
1. QUALITY: Minimum 1500 words not counting frontmatter. Minimum 5 H2 headings. Include a FAQ section with 4-6 questions.
2. GEO SECTIONS (REQUIRED): Immediately after the H1, output EXACTLY this structure (never at the end or after the divider):
<div class="key-takeaways">

## Key Takeaways

- (3-5 specific bullet points with real numbers, tool names, and data from the article)

</div>

<div class="quick-answer">

## Quick Answer

(2-3 sentence direct recommendation-first answer naming the top pick)

</div>
3. PRODUCT MENTIONS: When relevant to the topic, you may naturally mention AI tools or services by name, but do NOT insert any affiliate or external purchase links. Keep the article self-contained with internal cross-links only.
4. COVER IMAGE: Set the cover to a LOCAL path, never an external URL. Use: cover: "/images/<slug>.jpg" where <slug> is the post slug in lowercase-hyphen format (e.g. "/images/best-ai-writing-tools-2026.jpg"). The build pipeline auto-generates this image; do NOT use images.unsplash.com or any placeholder URL.
5. NEVER repeat "Key Takeaways" or "Quick Answer" headings anywhere in the article except in the GEO sections after the H1. Include them exactly once.

Your output must be valid Markdown with YAML frontmatter. Use this exact structure:

---
title: "<SEO title 50-60 chars>"
slug: "<lowercase-hyphen-slug-derived-from-the-title-NEVER-angle-brackets-NEVER-the-literal-text-auto>"
excerpt: "<150-160 char meta description including primary keyword>"
description: "<same as excerpt>"
date: "<YYYY-MM-DD>"
lastUpdated: "<YYYY-MM-DD>"
author: "AI Pulse Editorial"
category: "<Reviews|Comparisons|Tutorials|Best Of|AI News>"
tags: ["tag1", "tag2", "tag3", "tag4", "tag5"]
cover: "/images/<slug>.jpg"
draft: false
---

# <H1 — include primary keyword>

<2-3 sentence hook. Primary keyword in first sentence. Keep it punchy.>

<div class="key-takeaways">

## Key Takeaways

- 3-5 bullet summary points with specific numbers and data

</div>

<div class="quick-answer">

## Quick Answer

<2-3 sentence direct answer. Start with a clear recommendation, not background.>

</div>

## What Is <Primary Keyword>?

<Define topic. 2-3 paragraphs with specific examples. Use primary keyword 2-3 times.>

## How We Tested

<1 paragraph methodology — E-E-A-T trust signal. Include time spent, number of tools tested, criteria.>

<5-8 main H2 sections, 250-400 words each. NEVER repeat same H2 heading twice. Each section must have specific tool names, prices, and data. Do NOT insert any Amazon or external affiliate links; use internal cross-links to other posts instead.>

## Pros and Cons

| Pros | Cons |
|------|------|
| <specific point> | <specific point> |
| <specific point> | <specific point> |

## Pricing Overview

<Structured pricing — AI engines love comparison tables.>

## Who Should Use This?

<2-3 specific user personas with tool recommendations.>

## Who Should Skip This?

<Honest counter-recommendation with alternative suggestions.>

## FAQ

### <Real question people search>
<2-3 sentence answer with specific details>

### <Real question people search>
<2-3 sentence answer with specific details>

### <Real question people search>
<2-3 sentence answer with specific details>

### <Real question people search>
<2-3 sentence answer with specific details>

(minimum 4 questions, 6 max)

## Final Verdict

<3-4 sentence verdict. Bold the final recommendation. Include a comparison to a runner-up.>

---

**About the author:** AI Pulse Editorial tests AI tools hands-on. Prices and ratings are accurate as of publication date.`;

async function generatePost(provider, topicObj) {
  const topic = topicObj.topic;
  const keywords = (topicObj.keywords || [topic]).join(', ');
  const category = topicObj.category || 'AI Tools';

  console.log(`📝 Generating: "${topic}"`);

  const userPrompt = `Write a complete, publication-ready blog post for the topic: "${topic}".
Primary keyword: "${topic}"
Related keywords: ${keywords}
Category: ${category}
Target length: 2,500-3,000 words
Tone: expert, friendly, slightly opinionated. Use specific numbers, examples, and real tool names.
Include a real comparison table where relevant.
Intro must be under 80 words.
Every H2 must be unique — NEVER repeat the same H2 heading twice.
FAQ: 4-6 real questions people ask on Google.
Cite at least 2 real competitors.
CRITICAL: Return ONLY the markdown with frontmatter — no preamble or commentary. Start directly with "---" and end with markdown.
IMPORTANT GEO RULE: Immediately after the "# <H1>" line, output EXACTLY these two blocks in this order before any other H2:
<div class="key-takeaways">

## Key Takeaways

- (3-5 bullets)

</div>

<div class="quick-answer">

## Quick Answer

(2-3 sentence direct answer)

</div>
Do NOT place Key Takeaways or Quick Answer anywhere else in the article.
`;

  const content = await provider.generateText(userPrompt, SYSTEM_PROMPT);

  // DEBUG (2026-10-05): the NVIDIA model list rotated onto live-but-small models
  // (meta/llama-3.2-11b-vision-instruct). They return ~1000-2000 words for a
  // 2,500-3,000 word prompt and sometimes omit the closing `---` fence, which the
  // frontmatter gate below then rejects. Keep the last raw response on disk so a
  // failed run is diagnosable without re-spending provider quota.
  if (process.env.DEBUG_RAW_RESPONSE) {
    try {
      fs.writeFileSync(path.join(__dirname, '.last-raw-response.md'), String(content).slice(0, 40000));
    } catch (_) { /* non-fatal */ }
  }

  // Strip code fences if model wrapped it
  let cleaned = content.replace(/^```markdown\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');

  // Strip any PREAMBLE the model emitted before the frontmatter fence. The prompt
  // already says "Start directly with ---", but models (especially gpt-oss, which
  // reasons before answering) sometimes emit "Here is the article:" or a
  // reasoning block first. Without this, `polish-posts.js` aborts the whole
  // scheduled-content run with "missing frontmatter" on a post that was counted
  // as generated — observed 2026-10-03 on run 37156706739
  // ("5 generated, 0 failed" then "❌ chatgpt-prompting-guide-2026.mdx:
  // missing frontmatter" and exit 1).
  //
  // TRAILING-SPACE TOLERANCE (2026-10-06): the live NVIDIA model emits an opening
  // fence as "--- \n" (one trailing space). `/^---\r?$/m` cannot see that fence,
  // so a preamble was never stripped AND the gate below rejected the response —
  // 6/8 topics failed with "no valid YAML frontmatter" on output that had a
  // complete, valid key block and 5.5KB of body. Fences now allow trailing
  // horizontal whitespace; still anchored, still a real `---` line.
  const fenceAt = cleaned.search(/^---[ \t]*\r?$/m);
  if (fenceAt > 0) {
    const preamble = cleaned.slice(0, fenceAt);
    // Only cut when what follows really is a frontmatter block (fence, keys, fence).
    const after = cleaned.slice(fenceAt).match(FM_BLOCK);
    if (after && /^[a-zA-Z_-]+:\s/m.test(after[1])) {
      cleaned = cleaned.slice(fenceAt);
      console.log(`   ⚠  stripped ${preamble.split('\n').length} line(s) of prose preamble before the frontmatter`);
    }
  }

  // REPAIR a missing closing fence, THEN gate.
  //
  // The live NVIDIA model sometimes emits an opening fence and then never closes
  // it (2026-10-06: `--- ` + 11 valid keys, then straight into "# H1", with the
  // only later `---` lines inside a `| --- | --- |` table). Two traps here:
  //
  //   1. Simply relaxing the gate regex to allow a trailing space made this
  //      WORSE: the non-greedy `([\s\S]+?)` ran to the table separator and
  //      swallowed the whole 5.5KB body into the YAML block, so a "passing"
  //      response would have shipped a post that reds the build.
  //   2. So the key block is delimited by the first line that is NOT `key:`
  //      (blank line, heading, or prose) -- that is the true end of frontmatter
  //      whether or not the model closed the fence -- and a closing fence is
  //      re-inserted there when missing.
  //
  // This salvages the post instead of burning a queue topic on a cosmetic defect.
  const repaired = repairFrontmatter(cleaned);
  if (repaired.fixed) {
    console.log(`   ⚠  model omitted the closing "---" fence; re-inserted it before ${repaired.endReason}`);
    cleaned = repaired.text;
  }

  // GATE: a post without frontmatter is a FAILED generation, not a generated one.
  // Written before this gate, the file went to disk, the topic was dequeued, and
  // `ok++` ran — so the run reported success while shipping a post that reds the
  // build and deletes a queue topic. Never write, never dequeue, never count ok.
  //
  // The regex alone was NOT enough (observed 2026-10-05, commit 1d28ea9d8, CI
  // runs 37312070267 / 37312070234): it matches a body that merely CONTAINS a
  // later `---`, so a response with an unclosed fence — whole body swallowed
  // into the YAML — passed the gate and was written. gray-matter then threw
  // "end of the stream or a document separator is expected" and 3 posts shipped
  // with unreadable frontmatter. Parse for real, and require the keys the
  // audit-pipeline frontmatter gate needs.
  const FM_BLOCK = cleaned.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!FM_BLOCK) {
    throw new Error(
      'model returned no valid YAML frontmatter (no "---" ... "---" block with keys); ' +
      'refusing to write the post or dequeue the topic'
    );
  }
  let fmData;
  try {
    ({ data: fmData } = matter(cleaned));
  } catch (err) {
    throw new Error(
      'model frontmatter is not parseable YAML (' + (err.reason || err.message) + '); ' +
      'refusing to write the post or dequeue the topic'
    );
  }
  const FM_KEYS = ['title', 'slug', 'excerpt', 'date', 'category', 'tags'];
  const fmMissing = FM_KEYS.filter((k) => {
    const v = fmData[k];
    return v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
  });
  if (fmMissing.length) {
    throw new Error(
      'model frontmatter is missing required key(s): ' + fmMissing.join(', ') +
      '; refusing to write the post or dequeue the topic'
    );
  }

  // Fix date and lastUpdated to actual today (use m flag for multiline)
  const todayStr = new Date().toISOString().split('T')[0];
  cleaned = cleaned.replace(/^date:\s*["']?[^"'\n]+["']?/m, `date: "${todayStr}"`);
  cleaned = cleaned.replace(/^lastUpdated:\s*["']?[^"'\n]+["']?/m, `lastUpdated: "${todayStr}"`);

  // Derive slug from frontmatter or topic. Validate to prevent bad slugs like "excerpt:..."
  let slug = slugify(topic);
  const slugMatch = cleaned.match(/^slug:\s*["']?([^"'\n]+)["']?/m);
  if (slugMatch) {
    const candidate = slugMatch[1].trim().toLowerCase();
    // Only use the regex match if it looks like a valid slug (no YAML key names, no colons).
    // Also reject any non-slug character: `<auto>` is 6 chars with no colon, so it used to
    // PASS this gate, overwrite the good slugify(topic) value, and get written to disk as
    // content/posts/<auto>.mdx — an invalid Windows path that breaks every local
    // checkout/rebase of the repo (git: "invalid path 'content/posts/<auto>.mdx'").
    // A slug is [a-z0-9-] only; anything else means the model copied a prompt placeholder.
    if (/^[a-z0-9][a-z0-9-]*$/.test(candidate) && candidate.length > 5) {
      slug = candidate;
    }
  }
  // Ensure slug in frontmatter is never empty — write it back with quotes
  cleaned = cleaned.replace(/^slug:\s*.*$/m, `slug: "${slug}"`);

  // Quality check
  // Dedup GEO sections: remove Key Takeaways + Quick Answer if they appear after FAQ
  const faqIdx = cleaned.lastIndexOf('\n## FAQ');
  if (faqIdx > 0) {
    const beforeFaq = cleaned.slice(0, faqIdx);
    const afterFaq = cleaned.slice(faqIdx);
    const hasGeoNearTop = beforeFaq.includes('class="key-takeaways"') && beforeFaq.includes('class="quick-answer"');
    if (hasGeoNearTop) {
      // Strip trailing GEO sections before FAQ
      cleaned = beforeFaq.replace(/\n## Quick Answer[\s\S]*?(?=\n##|$)/, '')
        .replace(/\n<div class="key-takeaways">[\s\S]*?\n<\/div>/, '')
        + afterFaq;
    }
  }

  // GEO fallback
  // inject a key-takeaways block right after the H1 so the site's GEO detector is satisfied.
  const hasQuick = cleaned.includes('class="quick-answer"');
  const hasKeyT = cleaned.includes('class="key-takeaways"');
  if (hasQuick && !hasKeyT) {
    const h1Match = cleaned.match(/# .*/);
    if (h1Match) {
      const inject = '\n<div class="key-takeaways">\n\n## Key Takeaways\n\n- ' + topic + ': our hands-on review of what matters most for readers.\n- We compare real performance, pricing, and top alternatives.\n- Read the full analysis below for detailed recommendations.\n\n</div>\n';
      cleaned = cleaned.replace(h1Match[0], h1Match[0] + inject);
    }
  }
  const body = cleaned.match(/^---\r?\n[\s\S]+?\r?\n---\r?\n([\s\S]+)$/)?.[1] || cleaned;
  const wordCount = body.split(/\s+/).filter(Boolean).length;
  const h2Count = (body.match(/^## /gm) || []).length;
  const hasFaq = body.includes('## FAQ');
  // Check the FINAL cleaned output (after any GEO fallback inject)
  const hasGEO = cleaned.includes('class="key-takeaways"') && cleaned.includes('class="quick-answer"');
  const warnings = [];
  if (wordCount < 800) warnings.push(`thin content (${wordCount} words)`);
  if (h2Count < 3) warnings.push(`only ${h2Count} H2 headings`);
  if (!hasFaq) warnings.push('missing FAQ');
  if (!hasGEO) warnings.push('missing GEO sections');
  if (warnings.length > 0) console.log(`   ⚠  ${warnings.join(', ')}`);

  const filePath = path.join(POSTS_DIR, `${slug}.mdx`);
  fs.writeFileSync(filePath, cleaned, 'utf8');
  console.log(`✅ Wrote ${filePath} (${(cleaned.length / 1024).toFixed(1)} KB, ${wordCount} words, ${h2Count} H2)`);

  // Auto-generate a local cover image (free source, no API key)
  try {
    const { execSync } = require('child_process');
    const tagsLine = (cleaned.match(/^tags:\s*\[(.*?)\]/m) || [])[1] || '';
    const kw = (tagsLine.split(',').map(t => t.trim().replace(/['"]/g, '')).filter(Boolean)[0] || topic).split(' ').slice(0, 3).join(',');
    execSync(`node scripts/media-gen.js --slug "${slug}" --keywords "${kw}" --title "${encodeURIComponent(topic)}"`, { cwd: ROOT, stdio: 'ignore' });
  } catch (imgErr) {
    console.log(`   ⚠  cover image skipped: ${imgErr.message.split('\n')[0]}`);
  }

  // Remove from queue if it was there
  if (fromQueue) {
    const queue = JSON.parse(fs.readFileSync(KEYWORD_QUEUE, 'utf8'));
    const filtered = queue.filter((k) => k.topic !== topic);
    fs.writeFileSync(KEYWORD_QUEUE, JSON.stringify(filtered, null, 2));
  }
  return filePath;
}

// Runtime failover (2026-10-08): a provider whose key is PRESENT can still fail at
// call time — Gemini returned 503 UNAVAILABLE "high demand" while OpenRouter was
// healthy, and because fallback only triggered on a MISSING key, the whole triage
// run wrote 0 posts and still exited 0. Wrap the call so a transient upstream
// failure rotates to the next keyed provider instead of killing the batch.
function providerFailover(primary) {
  const rest = FALLBACK_ORDER.filter(
    (p) => p !== primary && providerHasKey(p)
  ).concat(
    // Include the requested provider last in case it recovers on a second attempt.
    providerHasKey(primary) ? [] : []
  );
  return {
    name: primary,
    async generateText(prompt, system) {
      try {
        return await primary.generateText(prompt, system);
      } catch (err) {
        const msg = String(err && err.message ? err.message : err).slice(0, 120);
        console.log(`   ⚠️ ${primary.name} failed (${msg}) — trying ${rest.length} keyed fallback(s)`);
        for (const alt of rest) {
          try {
            const factory = PROVIDERS[alt];
            if (!factory) continue;
            const p = await factory();
            console.log(`   ⚡ failover -> ${p.name}`);
            const out = await p.generateText(prompt, system);
            console.log(`   ✅ failover succeeded via ${p.name}`);
            return out;
          } catch (err2) {
            console.log(`   ⚠️ ${alt} also failed (${String(err2 && err2.message ? err2.message : err2).slice(0, 100)})`);
          }
        }
        throw err;
      }
    },
  };
}

// ================================================================
// Main
// ================================================================

(async () => {
  if (!topicArg && !fromQueue) {
    console.error('Usage:');
    console.error('  node scripts/generate-post.js "topic here"');
    console.error('  node scripts/generate-post.js --from-keywords');
    console.error('  node scripts/generate-post.js --from-keywords --batch 5');
    console.error('');
    console.error('Set AI_PROVIDER=nvidia|groq|openrouter|gemini|ollama|openai in .env.local');
    process.exit(1);
  }

  const provider = providerFailover(await getProvider());
  const topics = getTopics();
  let ok = 0, fail = 0;
  for (let i = 0; i < topics.length; i++) {
    const t = topics[i];
    try {
      await generatePost(provider, t);
      ok++;
    } catch (err) {
      console.error(`❌ Failed: ${t.topic}\n   ${err.message}`);
      fail++;
    }
    // Adaptive backoff: longer sleep between posts so we don't trip rate limits
    if (i < topics.length - 1) {
      const sleepSec = fail > 0 ? 15 : 8;
      process.stdout.write(`   ⏱  waiting ${sleepSec}s before next post...\n`);
      await new Promise((r) => setTimeout(r, sleepSec * 1000));
    }
  }
  console.log(`\n🎉 Done. ${ok} generated, ${fail} failed.`);
  console.log('Next: review files in content/posts/, add cover images, then git push to deploy.');
  // A batch where every generation failed is a failure, not a success. Exiting
  // 0 here is what let the dead-model 404 chain (fixed above) ship days of
  // "green" scheduled-content runs that wrote zero posts. Callers in CI now go
  // red on it instead of silently no-op-ing. Partial success (ok > 0) and an
  // empty queue (fail === 0) both still exit 0.
  if (fail > 0 && ok === 0) {
    console.error(`\n💥 All ${fail} generations failed — no posts written. Failing the run.`);
    process.exit(1);
  }
})().catch((err) => {
  console.error('\n💥 Fatal:', err.message);
  console.error('\nQuick fix:');
  console.error('  1. Sign up free at https://console.groq.com/');
  console.error('  2. Get a key at https://console.groq.com/keys');
  console.error('  3. Add to .env.local:  GROQ_API_KEY=***   AI_PROVIDER=groq');
  console.error('  4. Run:  node scripts/generate-post.js --from-keywords');
  process.exit(1);
});

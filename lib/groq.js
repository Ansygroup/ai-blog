const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';

export function getGroqKey() {
  return process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_2 || '';
}

export async function groqGenerate(prompt, options = {}) {
  const key = getGroqKey();
  if (!key) return null;

  try {
    const res = await fetch(GROQ_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || 'qwen/qwen3-32b',
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens || 1024,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Groq error ${res.status}: ${err.slice(0, 200)}`);
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error('Groq fetch failed:', err.message);
    return null;
  }
}

export async function groqJson(prompt, options = {}) {
  const text = await groqGenerate(
    `${prompt}\n\nRespond with valid JSON only, no markdown formatting, no code fences.`,
    { ...options, temperature: 0.3, maxTokens: 2048 }
  );
  if (!text) return null;
  try {
    return JSON.parse(text.trim());
  } catch {
    return null;
  }
}

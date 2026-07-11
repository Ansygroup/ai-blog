#!/usr/bin/env node
const https = require('https');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';

function getGroqKey() {
  return process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_2 || '';
}

function groqGenerate(prompt, options = {}) {
  return new Promise((resolve) => {
    const key = getGroqKey();
    if (!key) return resolve(null);

    const body = JSON.stringify({
      model: options.model || 'qwen/qwen3-32b',
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature ?? 0.5,
      max_tokens: options.maxTokens || 2048,
    });

    const urlObj = new URL(GROQ_API);
    const req = https.request(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            console.error(`Groq error ${res.statusCode}: ${data.slice(0, 200)}`);
            return resolve(null);
          }
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.choices?.[0]?.message?.content || null);
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on('error', (err) => {
      console.error('Groq request failed:', err.message);
      resolve(null);
    });
    req.write(body);
    req.end();
  });
}

function groqJson(prompt, options = {}) {
  return groqGenerate(
    `${prompt}\n\nRespond with valid JSON only, no markdown formatting, no code fences.`,
    { ...options, temperature: 0.3, maxTokens: 2048 }
  ).then((text) => {
    if (!text) return null;
    try { return JSON.parse(text.trim()); } catch { return null; }
  });
}

function hasGroqKey() {
  return !!getGroqKey();
}

module.exports = { getGroqKey, groqGenerate, groqJson, hasGroqKey };

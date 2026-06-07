import type { GroqKey } from '../../lib/types';

interface GroqOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface GroqResponse {
  content: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  keyUsed: string;
  latencyMs: number;
}

const DEFAULT_OPTIONS: GroqOptions = {
  model: process.env.GROQ_MODEL || 'qwen/qwen3-32b',
  temperature: 0.7,
  maxTokens: 4096,
};

/** Jitter: random ±25% of base */
function jitter(base: number): number {
  return Math.round(base * (0.75 + Math.random() * 0.5));
}

export class GroqClient {
  private keys: GroqKey[];
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private maxRetries = 5;
  private keyIndex = 0;
  private cooldowns: Map<string, number> = new Map();
  private reqTimestamps: Map<string, number[]> = new Map();

  constructor(keys: GroqKey[], options?: GroqOptions) {
    if (!keys.length) throw new Error('No Groq API keys provided');
    this.keys = keys;
    this.model = options?.model || DEFAULT_OPTIONS.model!;
    this.temperature = options?.temperature ?? DEFAULT_OPTIONS.temperature!;
    this.maxTokens = options?.maxTokens || DEFAULT_OPTIONS.maxTokens!;
  }

  get keyCount(): number {
    return this.keys.length;
  }

  private getNextKey(): GroqKey | null {
    const now = Date.now();
    for (let attempt = 0; attempt < this.keys.length * 3; attempt++) {
      const key = this.keys[this.keyIndex % this.keys.length];
      this.keyIndex++;
      const cooldown = this.cooldowns.get(key.id);
      if (cooldown && now <= cooldown) continue;
      // Rate-limit: allow max 25 req/min per key (safety margin under 30/min)
      const timestamps = this.reqTimestamps.get(key.id) || [];
      const recent = timestamps.filter(t => now - t < 60000);
      if (recent.length >= 25) continue;
      return key;
    }
    return null;
  }

  private trackRequest(keyId: string) {
    const now = Date.now();
    const timestamps = this.reqTimestamps.get(keyId) || [];
    this.reqTimestamps.set(keyId, [...timestamps.filter(t => now - t < 60000), now]);
  }

  private sleep(ms: number) {
    return new Promise(r => setTimeout(r, ms));
  }

  async generate(prompt: string, options?: Partial<GroqOptions>): Promise<GroqResponse> {
    let lastErr: string | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      const key = this.getNextKey();
      if (!key) {
        const wait = jitter(Math.min(4000 * Math.pow(2, attempt), 30000));
        await this.sleep(wait);
        continue;
      }

      const start = Date.now();
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key.key_value}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: options?.model || this.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: options?.temperature ?? this.temperature,
            max_tokens: options?.maxTokens || this.maxTokens,
          }),
        });

        if (res.status === 429) {
          lastErr = `429 rate limit on ${key.label || key.id}`;
          this.cooldowns.set(key.id, Date.now() + 30000);
          const wait = jitter(Math.min(4000 * Math.pow(2, attempt), 25000));
          await this.sleep(wait);
          continue;
        }

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Groq ${res.status}: ${err.slice(0, 200)}`);
        }

        const data: any = await res.json();
        const choice = data.choices?.[0];
        this.trackRequest(key.id);

        return {
          content: choice?.message?.content || '',
          usage: {
            promptTokens: data.usage?.prompt_tokens || 0,
            completionTokens: data.usage?.completion_tokens || 0,
            totalTokens: data.usage?.total_tokens || 0,
          },
          keyUsed: key.label || key.id,
          latencyMs: Date.now() - start,
        };
      } catch (err: any) {
        lastErr = err.message;
        if (err.message?.includes('429')) {
          this.cooldowns.set(key.id, Date.now() + 30000);
          await this.sleep(jitter(5000 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }

    throw new Error(`Groq failed after ${this.maxRetries} retries: ${lastErr}`);
  }

  async generateBatch(prompts: string[], concurrency = 2): Promise<GroqResponse[]> {
    const results: GroqResponse[] = [];
    for (let i = 0; i < prompts.length; i += concurrency) {
      const batch = prompts.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(batch.map(p => this.generate(p)));
      for (const r of batchResults) {
        if (r.status === 'fulfilled') results.push(r.value);
        else results.push({ content: '', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, keyUsed: '', latencyMs: 0 });
      }
      if (i + concurrency < prompts.length) await this.sleep(jitter(3000));
    }
    return results;
  }
}

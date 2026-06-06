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

export class GroqClient {
  private keys: GroqKey[];
  private currentIndex = 0;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private maxRetries = 3;

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

  private getNextKey(): GroqKey {
    const key = this.keys[this.currentIndex % this.keys.length];
    this.currentIndex++;
    return key;
  }

  private sleep(ms: number) {
    return new Promise(r => setTimeout(r, ms));
  }

  async generate(prompt: string, options?: Partial<GroqOptions>): Promise<GroqResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await this.sleep(delay);
      }

      const key = this.getNextKey();
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
          lastError = new Error(`Groq 429: rate limited on ${key.label}`);
          continue;
        }

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Groq ${res.status}: ${err.slice(0, 200)}`);
        }

        const data: any = await res.json();
        const choice = data.choices?.[0];

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
        if (err.message?.includes('429')) {
          lastError = err;
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error('Groq generation failed after retries');
  }

  async generateBatch(prompts: string[], concurrency = 5): Promise<GroqResponse[]> {
    const results: GroqResponse[] = [];
    for (let i = 0; i < prompts.length; i += concurrency) {
      const batch = prompts.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(batch.map(p => this.generate(p)));
      for (const r of batchResults) {
        if (r.status === 'fulfilled') results.push(r.value);
        else results.push({ content: '', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, keyUsed: '', latencyMs: 0 });
      }
    }
    return results;
  }
}

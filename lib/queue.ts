import type { QueueTier, KeywordQueueItem } from './types';
import { getQueueItems, updateQueueStatus, addToQueue } from './db';

const CONCURRENCY_PER_KEY = 10;

export interface QueueBatch {
  items: KeywordQueueItem[];
  totalPending: number;
}

export async function fetchNextBatch(tier?: QueueTier, limit = 50): Promise<QueueBatch> {
  const items = await getQueueItems(limit, tier);
  const db = await import('./db');
  const total = await db.countQueue('pending');
  return { items, totalPending: total };
}

export async function distributeToWorkers(items: KeywordQueueItem[], groqKeysCount: number): Promise<{ task: { keyword: string; tier: QueueTier; template: 'news' | 'seo' | 'affiliate'; groqKey: string; agentId: number }; keyIndex: number }[]> {
  const tasks: { keyword: string; tier: QueueTier; template: 'news' | 'seo' | 'affiliate'; groqKey: string; agentId: number }[] = [];
  for (const item of items) {
    const template = item.tier === 1 ? 'news' : item.tier === 5 ? 'affiliate' : 'seo';
    tasks.push({ keyword: item.keyword, tier: item.tier, template, groqKey: '', agentId: 0 });
  }
  return tasks.map((t, i) => ({
    task: { ...t, groqKey: '', agentId: i },
    keyIndex: i % Math.max(groqKeysCount, 1),
  }));
}

export async function addKeywords(keywords: { keyword: string; tier: QueueTier; source?: string; volume?: number; cpc?: number; difficulty?: number; opportunity?: number }[]) {
  const results: (KeywordQueueItem | null)[] = [];
  for (const kw of keywords) {
    const item = await addToQueue(kw.keyword, kw.tier, kw.source, kw.volume, kw.cpc, kw.difficulty, kw.opportunity);
    results.push(item);
  }
  return results;
}

export function buildArticleSlug(keyword: string): string {
  return keyword
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80) + '-2026';
}

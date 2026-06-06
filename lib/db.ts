import { createClient } from '@supabase/supabase-js';
import type { KeywordQueueItem, PublishedPage, GSCData, ImageCache, GroqKey, QueueTier, QueueStatus } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let client: ReturnType<typeof createClient> | null = null;

export function getDb() {
  if (!client && supabaseUrl && supabaseKey) {
    client = createClient(supabaseUrl, supabaseKey);
  }
  return client;
}

export function isDbReady(): boolean {
  return !!(supabaseUrl && supabaseKey);
}

function q<T = any>(table: string) {
  const db = getDb();
  return db ? db.from(table) as any : null;
}

// ─── Queue Operations ───

export async function getQueueItems(limit = 100, tier?: QueueTier): Promise<KeywordQueueItem[]> {
  const table = q('keyword_queue');
  if (!table) return [];
  let query = table.select('*').eq('status', 'pending').order('opportunity', { ascending: false }).limit(limit);
  if (tier) query = query.eq('tier', tier);
  const { data } = await query;
  return (data || []) as KeywordQueueItem[];
}

export async function updateQueueStatus(id: string, status: QueueStatus, error?: string) {
  const table = q('keyword_queue');
  if (!table) return;
  const update: any = { status };
  if (status === 'published') update.published_at = new Date().toISOString();
  if (error) update.error_log = error;
  await table.update(update).eq('id', id);
}

export async function addToQueue(keyword: string, tier: QueueTier, source = 'manual', volume = 0, cpc = 0, difficulty = 50, opportunity = 50) {
  const table = q('keyword_queue');
  if (!table) return null;
  const { data } = await table.insert({
    keyword, tier, source, search_volume: volume, cpc, difficulty, opportunity, status: 'pending',
  }).select().single();
  return data as KeywordQueueItem | null;
}

export async function countQueue(status?: QueueStatus): Promise<number> {
  const table = q('keyword_queue');
  if (!table) return 0;
  let query = table.select('id', { count: 'exact', head: true });
  if (status) query = query.eq('status', status);
  const { count } = await query;
  return count || 0;
}

// ─── Pages ───

export async function insertPage(page: any) {
  const table = q('pages');
  if (!table) return null;
  const { data } = await table.insert(page).select().single();
  return data as PublishedPage | null;
}

export async function getPages(type?: string, limit = 100): Promise<PublishedPage[]> {
  const table = q('pages');
  if (!table) return [];
  let query = table.select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(limit);
  if (type) query = query.eq('type', type);
  const { data } = await query;
  return (data || []) as PublishedPage[];
}

export async function slugExists(slug: string): Promise<boolean> {
  const table = q('pages');
  if (!table) return false;
  const { data } = await table.select('id').eq('slug', slug).maybeSingle();
  return !!data;
}

// ─── GSC ───

export async function insertGSC(rows: any[]) {
  const table = q('gsc_data');
  if (!table) return;
  await table.upsert(rows, { onConflict: 'page_id,date' });
}

export async function getUnderperformingPages(threshold = 50) {
  const table = q('gsc_data');
  if (!table) return [];
  const { data } = await table
    .select('page_id, pages!inner(slug, keyword, type, seo_score)')
    .gte('impressions', 1)
    .lte('position', threshold)
    .order('position', { ascending: true });
  return (data as any[]) || [];
}

// ─── Images ───

export async function getCachedImage(query: string): Promise<ImageCache | null> {
  const table = q('image_cache');
  if (!table) return null;
  const { data } = await table.select('*').eq('query', query).maybeSingle();
  return data as ImageCache | null;
}

export async function cacheImage(query: string, imageUrl: string, attribution?: string) {
  const table = q('image_cache');
  if (!table) return;
  await table.upsert({ query, image_url: imageUrl, attribution }, { onConflict: 'query' });
}

// ─── Groq Keys ───

export async function getActiveGroqKeys(): Promise<GroqKey[]> {
  const table = q('groq_keys');
  let dbKeys: GroqKey[] = [];
  if (table) {
    const { data } = await table.select('*').eq('is_active', true);
    dbKeys = (data || []) as GroqKey[];
  }
  const envKeys: GroqKey[] = [];
  if (process.env.GROQ_API_KEY) envKeys.push({ id: 'env', key_value: process.env.GROQ_API_KEY, label: 'GROQ_API_KEY', is_active: true, usage_count: 0, rate_limit: 30 });
  if (process.env.GROQ_API_KEY_2) envKeys.push({ id: 'env2', key_value: process.env.GROQ_API_KEY_2, label: 'GROQ_API_KEY_2', is_active: true, usage_count: 0, rate_limit: 30 });
  if (process.env.GROQ_API_KEY_3) envKeys.push({ id: 'env3', key_value: process.env.GROQ_API_KEY_3, label: 'GROQ_API_KEY_3', is_active: true, usage_count: 0, rate_limit: 30 });
  if (process.env.GROQ_API_KEY_4) envKeys.push({ id: 'env4', key_value: process.env.GROQ_API_KEY_4, label: 'GROQ_API_KEY_4', is_active: true, usage_count: 0, rate_limit: 30 });
  if (process.env.GROQ_API_KEY_5) envKeys.push({ id: 'env5', key_value: process.env.GROQ_API_KEY_5, label: 'GROQ_API_KEY_5', is_active: true, usage_count: 0, rate_limit: 30 });
  return [...dbKeys, ...envKeys];
}

export async function incrementGroqUsage(keyId: string) {
  const table = q('groq_keys');
  if (!table || keyId.startsWith('env')) return;
  await table.rpc('increment_groq_usage', { key_id: keyId });
}

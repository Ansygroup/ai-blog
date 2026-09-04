// Mock db for local mode (no Supabase)
// Provides the same interface as the real db.ts but uses local files

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const QUEUE_FILE = path.join(DATA_DIR, 'queue.json');
const GROQ_KEYS_FILE = path.join(DATA_DIR, 'groq-keys.json');
const IMAGE_CACHE_FILE = path.join(DATA_DIR, 'image-cache.json');

export interface CachedImage {
  query: string;
  image_url: string;
  attribution?: string;
  created_at: string;
}

// Types
export interface GroqKey {
  id: string;
  key_value: string;
  tier: 1 | 2 | 3 | 4 | 5;
  volume: number;
  cpc: number;
  difficulty: number;
  opportunity: number;
  status: 'active' | 'inactive' | 'exhausted';
  source: string;
  created_at: string;
}

export interface QueueTier {
  1: 'tier-1';
  2: 'tier-2';
  3: 'tier-3';
  4: 'tier-4';
  5: 'tier-5';
}
export type QueueTierKey = keyof QueueTier;

export interface KeywordQueueItem {
  id: string;
  keyword: string;
  tier: QueueTierKey;
  source?: string;
  volume?: number;
  cpc?: number;
  difficulty?: number;
  opportunity?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at?: string;
}

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize queue file if not exists
if (!fs.existsSync(QUEUE_FILE)) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify([]), 'utf8');
}

// Initialize groq keys file if not exists (will be filled from .env)
if (!fs.existsSync(GROQ_KEYS_FILE)) {
  fs.writeFileSync(GROQ_KEYS_FILE, JSON.stringify([]), 'utf8');
}

// Helper to read JSON file
function readJsonFile<T>(filePath: string): T {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e);
    // Return default based on file
    if (filePath.endsWith('queue.json')) return [] as T;
    if (filePath.endsWith('groq-keys.json')) return [] as T;
    return {} as T;
  }
}

// Helper to write JSON file
function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error(`Error writing ${filePath}:`, e);
  }
}

// Load Groq keys from .env.local (simplified)
export async function getActiveGroqKeys(): Promise<GroqKey[]> {
  // In real scenario, we'd parse .env.local for GROQ_API_KEY, GROQ_API_KEY_2, etc.
  // For now, we'll return an empty array and let the agent handle it.
  // The agent already checks for length and exits if none.
  // We could read from the groq-keys.json file which might be populated by another process.
  const keys = readJsonFile<GroqKey[]>(GROQ_KEYS_FILE);
  return keys.filter(k => k.status === 'active');
}

export function isDbReady(): boolean {
  // Always return false for local mode (no Supabase)
  return false;
}

export async function getQueueItems(limit: number, tier?: QueueTierKey): Promise<KeywordQueueItem[]> {
  const queue = readJsonFile<KeywordQueueItem[]>(QUEUE_FILE);
  let filtered = queue;
  if (tier) {
    filtered = queue.filter(item => item.tier === tier);
  }
  // Only pending items
  filtered = filtered.filter(item => item.status === 'pending');
  // Sort by created_at ascending (oldest first)
  filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return filtered.slice(0, limit);
}

export async function updateQueueStatus(id: string, status: KeywordQueueItem['status']): Promise<void> {
  const queue = readJsonFile<KeywordQueueItem[]>(QUEUE_FILE);
  const item = queue.find(i => i.id === id);
  if (item) {
    item.status = status;
    item.updated_at = new Date().toISOString();
    writeJsonFile(QUEUE_FILE, queue);
  }
}

export async function addToQueue(
  keyword: string,
  tier: QueueTierKey,
  source?: string,
  volume?: number,
  cpc?: number,
  difficulty?: number,
  opportunity?: number
): Promise<KeywordQueueItem | null> {
  const queue = readJsonFile<KeywordQueueItem[]>(QUEUE_FILE);
  const newItem: KeywordQueueItem = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    keyword,
    tier,
    source: source || 'unknown',
    volume: volume || 0,
    cpc: cpc || 0,
    difficulty: difficulty || 0,
    opportunity: opportunity || 0,
    status: 'pending',
    created_at: new Date().toISOString(),
  };
  queue.push(newItem);
  writeJsonFile(QUEUE_FILE, queue);
  return newItem;
}

export async function countQueue(status: KeywordQueueItem['status']): Promise<number> {
  const queue = readJsonFile<KeywordQueueItem[]>(QUEUE_FILE);
  return queue.filter(item => item.status === status).length;
}

export async function addKeywords(
  keywords: {
    keyword: string;
    tier: QueueTierKey;
    source?: string;
    volume?: number;
    cpc?: number;
    difficulty?: number;
    opportunity?: number;
  }[]
): Promise<(KeywordQueueItem | null)[]> {
  const results: (KeywordQueueItem | null)[] = [];
  for (const kw of keywords) {
    const item = await addToQueue(kw.keyword, kw.tier, kw.source, kw.volume, kw.cpc, kw.difficulty, kw.opportunity);
    results.push(item);
  }
  return results;
}

// ---- Image cache (local JSON-backed; replaces a missing SQLite helper) ----

function readImageCache(): CachedImage[] {
  return readJsonFile<CachedImage[]>(IMAGE_CACHE_FILE);
}

export async function getCachedImage(query: string): Promise<CachedImage | null> {
  if (!query) return null;
  const cache = readImageCache();
  return cache.find((c) => c.query === query) ?? null;
}

export async function cacheImage(
  query: string,
  imageUrl: string,
  attribution?: string
): Promise<void> {
  if (!query || !imageUrl) return;
  const cache = readImageCache();
  const existingIdx = cache.findIndex((c) => c.query === query);
  const entry: CachedImage = {
    query,
    image_url: imageUrl,
    attribution,
    created_at: new Date().toISOString(),
  };
  if (existingIdx >= 0) {
    cache[existingIdx] = entry;
  } else {
    cache.push(entry);
  }
  // Keep cache size bounded (~500 entries) to avoid unbounded growth.
  if (cache.length > 500) cache.splice(0, cache.length - 500);
  writeJsonFile(IMAGE_CACHE_FILE, cache);
}# Last fix: 2026-09-03 22:13:04 UTC - added getCachedImage/cacheImage exports

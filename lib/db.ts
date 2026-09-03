// Mock db for local mode (no Supabase)
// Provides the same interface as the real db.ts but uses local files

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { 
  KeywordQueueItem, 
  QueueTier, 
  GroqKey, 
  QueueStatus,
  PublishedPage,
  PageType,
  PageStatus
} from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const QUEUE_FILE = path.join(DATA_DIR, 'queue.json');
const GROQ_KEYS_FILE = path.join(DATA_DIR, 'groq-keys.json');
const IMAGE_CACHE_FILE = path.join(DATA_DIR, 'image-cache.json');
const PAGES_FILE = path.join(DATA_DIR, 'pages.json');

export interface CachedImage {
  query: string;
  image_url: string;
  attribution?: string;
  created_at: string;
}

// Internal storage interfaces (matching the existing JSON files)
interface StoredGroqKey {
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

interface StoredKeywordQueueItem {
  id: string;
  keyword: string;
  tier: QueueTier; // Note: we keep the same QueueTier (1|2|3|4|5) as types
  source?: string;
  volume?: number;
  cpc?: number;
  difficulty?: number;
  opportunity?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at?: string;
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
    if (filePath.endsWith('image-cache.json')) return [] as T;
    if (filePath.endsWith('pages.json')) return [] as T;
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

// Initialize image cache file if not exists
if (!fs.existsSync(IMAGE_CACHE_FILE)) {
  fs.writeFileSync(IMAGE_CACHE_FILE, JSON.stringify([]), 'utf8');
}

// Initialize pages file if not exists
if (!fs.existsSync(PAGES_FILE)) {
  fs.writeFileSync(PAGES_FILE, JSON.stringify([]), 'utf8');
}

// Load Groq keys from groq-keys.json and map to types.ts GroqKey
export async function getActiveGroqKeys(): Promise<GroqKey[]> {
  const storedKeys = readJsonFile<StoredGroqKey[]>(GROQ_KEYS_FILE);
  return storedKeys
    .filter(k => k.status === 'active')
    .map(k => ({
      id: k.id,
      key_value: k.key_value,
      label: k.key_value, // using key_value as label
      is_active: k.status === 'active',
      usage_count: k.volume, // using volume as usage_count (approximation)
      rate_limit: 0, // default, since we don't have this info
    })) as GroqKey[];
}

export function isDbReady(): boolean {
  // Always return false for local mode (no Supabase)
  return false;
}

export async function getQueueItems(limit: number, tier?: QueueTier): Promise<KeywordQueueItem[]> {
  const storedQueue = readJsonFile<StoredKeywordQueueItem[]>(QUEUE_FILE);
  let filtered = storedQueue;
  if (tier) {
    // tier is from types.QueueTier (1|2|3|4|5) and storage uses the same numeric tiers
    filtered = filtered.filter(item => item.tier === tier);
  }
  // Only pending items (internal status)
  filtered = filtered.filter(item => item.status === 'pending');
  // Sort by created_at ascending (oldest first)
  filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  // Map to types.KeywordQueueItem and slice
  return filtered
    .slice(0, limit)
    .map(item => ({
      id: item.id,
      keyword: item.keyword,
      tier: item.tier,
      source: item.source ?? '',
      search_volume: item.volume ?? 0,
      cpc: item.cpc ?? 0,
      difficulty: item.difficulty ?? 0,
      opportunity: item.opportunity ?? 0,
      status: mapInternalStatusToQueueStatus(item.status),
      error_log: undefined,
      created_at: item.created_at,
      published_at: undefined,
    }));
}

export async function updateQueueStatus(id: string, status: QueueStatus): Promise<void> {
  const queue = readJsonFile<StoredKeywordQueueItem[]>(QUEUE_FILE);
  const item = queue.find(i => i.id === id);
  if (item) {
    // Map incoming QueueStatus to internal status
    item.status = mapQueueStatusToInternalStatus(status);
    item.updated_at = new Date().toISOString();
    writeJsonFile(QUEUE_FILE, queue);
  }
}

export async function addToQueue(
  keyword: string,
  tier: QueueTier,
  source?: string,
  volume?: number,
  cpc?: number,
  difficulty?: number,
  opportunity?: number
): Promise<KeywordQueueItem | null> {
  const queue = readJsonFile<StoredKeywordQueueItem[]>(QUEUE_FILE);
  const newItem: StoredKeywordQueueItem = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    keyword,
    tier,
    source: source || 'unknown',
    volume: volume ?? 0,
    cpc: cpc ?? 0,
    difficulty: difficulty ?? 0,
    opportunity: opportunity ?? 0,
    status: 'pending',
    created_at: new Date().toISOString(),
  };
  queue.push(newItem);
  writeJsonFile(QUEUE_FILE, queue);
  // Return the mapped type
  return {
    id: newItem.id,
    keyword: newItem.keyword,
    tier: newItem.tier,
    source: newItem.source,
    search_volume: newItem.volume,
    cpc: newItem.cpc,
    difficulty: newItem.difficulty,
    opportunity: newItem.opportunity,
    status: mapInternalStatusToQueueStatus(newItem.status),
    error_log: undefined,
    created_at: newItem.created_at,
    published_at: undefined,
  };
}

export async function countQueue(status: QueueStatus): Promise<number> {
  const queue = readJsonFile<StoredKeywordQueueItem[]>(QUEUE_FILE);
  // Map the QueueStatus to internal status for counting
  const internalStatus = mapQueueStatusToInternalStatus(status);
  return queue.filter(item => item.status === internalStatus).length;
}

export async function addKeywords(
  keywords: {
    keyword: string;
    tier: QueueTier;
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

// ---- Page storage (local JSON-backed) ----

export async function slugExists(slug: string): Promise<boolean> {
  const pages = readJsonFile<PublishedPage[]>(PAGES_FILE);
  return pages.some(page => page.slug === slug);
}

export async function insertPage(page: PublishedPage): Promise<void> {
  const pages = readJsonFile<PublishedPage[]>(PAGES_FILE);
  // Ensure we don't insert duplicates (should be checked by caller, but safe)
  if (!pages.some(p => p.slug === page.slug)) {
    // Set timestamps if not provided
    const now = new Date().toISOString();
    const pageToInsert: PublishedPage = {
      ...page,
      created_at: page.created_at ?? now,
      updated_at: page.updated_at ?? now,
    };
    pages.push(pageToInsert);
    writeJsonFile(PAGES_FILE, pages);
  }
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
}

// Mapping functions
function mapInternalStatusToQueueStatus(internalStatus: 'pending' | 'processing' | 'completed' | 'failed'): QueueStatus {
  switch (internalStatus) {
    case 'pending': return 'pending';
    case 'processing': return 'generating';
    case 'completed': return 'published';
    case 'failed': return 'failed';
  }
}

function mapQueueStatusToInternalStatus(status: QueueStatus): 'pending' | 'processing' | 'completed' | 'failed' {
  switch (status) {
    case 'pending': return 'pending';
    case 'generating': return 'processing';
    case 'published': return 'completed';
    case 'rejected': return 'failed'; // map rejected to failed (we don't have rejected in internal)
    case 'failed': return 'failed';
  }
}
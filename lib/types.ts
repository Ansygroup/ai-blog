export type QueueTier = 1 | 2 | 3 | 4 | 5;
export type QueueStatus = 'pending' | 'generating' | 'published' | 'rejected' | 'failed';
export type PageStatus = 'active' | 'improved' | 'deleted';
export type PageType = 'news' | 'article' | 'affiliate' | 'review';

export interface KeywordQueueItem {
  id: string;
  keyword: string;
  tier: QueueTier;
  source: string;
  search_volume: number;
  cpc: number;
  difficulty: number;
  opportunity: number;
  status: QueueStatus;
  error_log?: string;
  created_at: string;
  published_at?: string;
}

export interface PublishedPage {
  id: string;
  slug: string;
  keyword: string;
  type: PageType;
  word_count: number;
  seo_score: number;
  cover_image?: string;
  status: PageStatus;
  queue_item_id?: string;
  created_at: string;
  updated_at: string;
}

export interface GSCData {
  id: string;
  page_id: string;
  date: string;
  impressions: number;
  clicks: number;
  position: number;
  ctr: number;
}

export interface ImageCache {
  id: string;
  query: string;
  image_url: string;
  attribution?: string;
  created_at: string;
}

export interface GroqKey {
  id: string;
  key_value: string;
  label: string;
  is_active: boolean;
  usage_count: number;
  rate_limit: number;
}

export interface Article {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  metaDescription: string;
  coverImage: string;
  imageAttribution?: string;
  tags: string[];
  category: string;
  faqs: { question: string; answer: string }[];
  rating?: number;
  wordCount: number;
  seoScore: number;
  source?: string;
}

export interface AgentTask {
  keyword: string;
  tier: QueueTier;
  template: 'news' | 'seo' | 'affiliate';
  groqKey: string;
  agentId: number;
}

export interface GenResult {
  success: boolean;
  article?: Article;
  error?: string;
  attempts?: number;
}

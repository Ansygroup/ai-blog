-- ============================================================
-- AI BLOG — SUPABASE SCHEMA
-- Multi-Level Queue + Published Pages + GSC Analytics
-- ============================================================

-- 1. KEYWORD QUEUE (all tiers)
CREATE TABLE IF NOT EXISTS keyword_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword         TEXT NOT NULL,
  tier            INT NOT NULL CHECK (tier BETWEEN 1 AND 5),
  source          TEXT DEFAULT 'manual',
  search_volume   INT DEFAULT 0,
  cpc             DECIMAL DEFAULT 0,
  difficulty      DECIMAL DEFAULT 50,
  opportunity     DECIMAL DEFAULT 50,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'published', 'rejected')),
  error_log       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  published_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_queue_status ON keyword_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_opportunity ON keyword_queue(opportunity DESC);
CREATE INDEX IF NOT EXISTS idx_queue_tier ON keyword_queue(tier);

-- 2. PUBLISHED PAGES
CREATE TABLE IF NOT EXISTS pages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  keyword       TEXT,
  type          TEXT CHECK (type IN ('news', 'article', 'affiliate', 'review')),
  word_count    INT DEFAULT 0,
  seo_score     DECIMAL DEFAULT 0,
  cover_image   TEXT,
  status        TEXT DEFAULT 'active' CHECK (status IN ('active', 'improved', 'deleted')),
  queue_item_id UUID REFERENCES keyword_queue(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pages_type ON pages(type);
CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status);

-- 3. GSC ANALYTICS (weekly import)
CREATE TABLE IF NOT EXISTS gsc_data (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id     UUID REFERENCES pages(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  impressions INT DEFAULT 0,
  clicks      INT DEFAULT 0,
  position    DECIMAL DEFAULT 0,
  ctr         DECIMAL DEFAULT 0,
  UNIQUE(page_id, date)
);

CREATE INDEX IF NOT EXISTS idx_gsc_page ON gsc_data(page_id);
CREATE INDEX IF NOT EXISTS idx_gsc_date ON gsc_data(date);

-- 4. IMAGE CACHE (avoid duplicate Unsplash fetches)
CREATE TABLE IF NOT EXISTS image_cache (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query       TEXT NOT NULL,
  image_url   TEXT NOT NULL,
  attribution TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(query)
);

-- 5. GROQ API KEYS (manage rotation)
CREATE TABLE IF NOT EXISTS groq_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_value   TEXT UNIQUE NOT NULL,
  label       TEXT DEFAULT '',
  is_active   BOOLEAN DEFAULT TRUE,
  usage_count INT DEFAULT 0,
  rate_limit  INT DEFAULT 30,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

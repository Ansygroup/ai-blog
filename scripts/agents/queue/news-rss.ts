#!/usr/bin/env tsx
/**
 * NEWS RSS INGESTOR AGENT v2
 * Fetches RSS feeds → rewrites via Groq → adds to queue
 * Deduplicates against already-published posts by title similarity.
 *
 * Usage:
 *   npx tsx scripts/agents/queue/news-rss.ts
 *   npx tsx scripts/agents/queue/news-rss.ts --limit 10 --dry-run
 *   npx tsx scripts/agents/queue/news-rss.ts --feeds verge,techcrunch
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env.local') });

import { getActiveGroqKeys, isDbReady, addToQueue } from '../../../lib/db';
import { getAllPosts } from '../../../lib/posts';
import { GroqClient } from '../groq-client';
import { buildNewsPrompt } from '../writers/templates/news-template';
import { scoreArticle, shouldPublish } from '../quality/seo-scorer';
import { publishArticle, parseArticleFromGroq } from '../publishing/publish-agent';
import { fetchImage } from '../../../lib/images';

const RSS_FEEDS: { url: string; name: string }[] = [
  { url: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml', name: 'The Verge AI' },
  { url: 'https://techcrunch.com/category/artificial-intelligence/feed/', name: 'TechCrunch AI' },
  { url: 'https://www.artificialintelligence-news.com/feed/', name: 'AI News' },
  { url: 'https://venturebeat.com/category/ai/feed/', name: 'VentureBeat AI' },
  { url: 'https://feeds.feedburner.com/singularityhub', name: 'Singularity Hub' },
];

interface RSSItem {
  title: string;
  link: string;
  contentSnippet: string;
  pubDate: string;
  source: string;
}

async function fetchRSS(url: string): Promise<RSSItem[]> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'AI-Blog-Agent/1.0' } });
    const xml = await res.text();
    const items: RSSItem[] = [];
    const titleRegex = /<title>([^<]+)<\/title>/g;
    const linkRegex = /<link[^>]*>([^<]+)<\/link>/g;
    const descRegex = /<description>([^<]*)<\/description>/g;
    const dateRegex = /<pubDate>([^<]+)<\/pubDate>/g;

    // Simple XML parser for RSS items
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(xml)) !== null) {
      const block = itemMatch[1];
      const title = block.match(/<title>([^<]*)<\/title>/)?.[1] || '';
      const link = block.match(/<link[^>]*>([^<]+)<\/link>/)?.[1] || '';
      const desc = block.match(/<description>([^<]*)<\/description>/)?.[1]?.replace(/<[^>]*>/g, '') || '';
      const date = block.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1] || '';
      if (title) items.push({ title, link, contentSnippet: desc.slice(0, 500), pubDate: date, source: url });
    }
    return items.slice(0, 10);
  } catch {
    return [];
  }
}

function dedupKey(title: string): string {
  // Normalize for comparison: lowercase, remove common words, keep key tokens
  return title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => !['the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'and', 'or', 'but', 'its', 'it', 'this', 'that', 'has', 'have', 'been', 'from', 'by', 'as', 'be', 'will', 'new', 'latest', 'top'].includes(w))
    .sort()
    .join(' ');
}

function isDuplicate(title: string, existingPosts: { title: string; slug: string }[]): boolean {
  const key = dedupKey(title);
  return existingPosts.some(p => {
    const existingKey = dedupKey(p.title);
    // Simple overlap check: if >60% of key tokens match, it's a duplicate
    const tokens = key.split(' ');
    const existingTokens = existingKey.split(' ');
    const matches = tokens.filter(t => existingTokens.includes(t)).length;
    return tokens.length > 2 && (matches / Math.max(tokens.length, existingTokens.length)) > 0.6;
  });
}

async function main() {
  const args = process.argv.slice(2);
  const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '5', 10);
  const dryRun = args.includes('--dry-run');
  const feedFilter = args.find(a => a.startsWith('--feeds='))?.split('=')[1];
  const feeds = feedFilter
    ? RSS_FEEDS.filter(f => feedFilter.split(',').some(n => f.name.toLowerCase().includes(n.toLowerCase())))
    : RSS_FEEDS;

  console.log(`\n📰 NEWS RSS INGESTOR AGENT v2\n`);
  console.log(`Feeds: ${feeds.length}/${RSS_FEEDS.length} | Limit: ${limit} per feed${dryRun ? ' | DRY RUN' : ''}\n`);

  const groqKeys = await getActiveGroqKeys();
  if (!groqKeys.length) { console.log('❌ No Groq API keys'); process.exit(1); }
  const groq = new GroqClient(groqKeys);
  const dbReady = isDbReady();

  // Load existing titles for dedup
  const allPosts: any[] = getAllPosts() || [];
  const existingPosts = allPosts.map(p => ({ title: p.title, slug: p.slug }));
  console.log(`📚 ${existingPosts.length} existing posts loaded for dedup`);

  let totalGenerated = 0;
  let skippedDuplicates = 0;
  let skippedSeo = 0;
  let failed = 0;

  for (const feed of feeds) {
    console.log(`\n📡 ${feed.name}...`);
    const items = await fetchRSS(feed.url);
    console.log(`   ${items.length} items`);

    for (const item of items.slice(0, limit)) {
      if (isDuplicate(item.title, existingPosts)) {
        console.log(`   ⏭️ Duplicate: ${item.title.slice(0, 60)}`);
        skippedDuplicates++;
        continue;
      }

      try {
        const prompt = buildNewsPrompt({
          keyword: item.title,
          sourceTitle: item.title,
          sourceContent: item.contentSnippet,
        });

        const result = await groq.generate(prompt, { temperature: 0.5, maxTokens: 2048 });
        const article = parseArticleFromGroq(result.content, item.title);
        if (!article) { console.log(`   ⚠️ Parse failed: ${item.title.slice(0, 50)}`); failed++; continue; }
        article.source = `rss:${feed.name}`;

        const seo = scoreArticle(article.content, article.title, article.metaDescription, article.tags, article.wordCount, article.faqs.length);
        article.seoScore = seo.score;

        // Pre-filter: only drop articles that fail basic quality (score < 45).
        // The supervisor runs a full SEO gate (>=75) before publishing.
        if (seo.score < 45) {
          console.log(`   ❌ SEO ${seo.score}: ${article.title.slice(0, 50)}`);
          skippedSeo++;
          continue;
        }

        article.coverImage = 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80';

        if (dryRun) {
          console.log(`   📄 SEO ${seo.score}: ${article.title.slice(0, 50)} (DRY RUN)`);
          totalGenerated++;
          continue;
        }

        if (dbReady) {
          await addToQueue(article.title, 1, `rss:${feed.name}`, 0, 0, 30, 80);
          console.log(`   ✅ Queued: ${article.slug}`);
          totalGenerated++;
        } else {
          const pub = await publishArticle(article);
          if (pub.success) {
            console.log(`   ✅ Published: ${article.slug}.mdx`);
            totalGenerated++;
          } else {
            console.log(`   ❌ ${pub.error}`);
            failed++;
          }
        }
      } catch (err: any) {
        console.log(`   ❌ ${item.title.slice(0, 40)}: ${err.message.slice(0, 80)}`);
        failed++;
      }
    }
  }

  console.log(`\n📊 RESULTS`);
  console.log(`   ✅ Generated: ${totalGenerated}`);
  console.log(`   ⏭️  Duplicates: ${skippedDuplicates}`);
  console.log(`   ❌ Low SEO:    ${skippedSeo}`);
  console.log(`   ❌ Failed:     ${failed}`);
  console.log(`Done.\n`);
}

main().catch(console.error);

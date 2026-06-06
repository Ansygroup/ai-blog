#!/usr/bin/env tsx
/**
 * NEWS RSS INGESTOR AGENT
 * Fetches RSS feeds → rewrites via Groq → adds to queue or generates directly
 * 
 * Usage:
 *   GROQ_API_KEY=gsk-... npx tsx scripts/agents/queue/news-rss.ts
 *   GROQ_API_KEY=gsk-... npx tsx scripts/agents/queue/news-rss.ts --limit 10 --dry-run
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import url from 'url';
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env.local') });

import { getActiveGroqKeys, isDbReady, addToQueue } from '../../../lib/db';
import { GroqClient } from '../groq-client';
import { buildNewsPrompt } from '../writers/templates/news-template';
import { scoreArticle, shouldPublish } from '../quality/seo-scorer';
import { publishArticle, parseArticleFromGroq } from '../publishing/publish-agent';
import { fetchImage } from '../../../lib/images';

const RSS_FEEDS = [
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

async function main() {
  const args = process.argv.slice(2);
  const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '5', 10);
  const dryRun = args.includes('--dry-run');

  console.log(`\n📰 NEWS RSS INGESTOR AGENT\n`);
  console.log(`Feeds: ${RSS_FEEDS.length} | Limit: ${limit} per feed${dryRun ? ' | DRY RUN' : ''}\n`);

  const groqKeys = await getActiveGroqKeys();
  if (!groqKeys.length) { console.log('❌ No Groq API keys'); process.exit(1); }
  const groq = new GroqClient(groqKeys);
  const dbReady = isDbReady();

  let totalGenerated = 0;

  for (const feed of RSS_FEEDS) {
    console.log(`📡 ${feed.name}...`);
    const items = await fetchRSS(feed.url);
    console.log(`   ${items.length} items found`);

    for (const item of items.slice(0, limit)) {
      try {
        const prompt = buildNewsPrompt({
          keyword: item.title,
          sourceTitle: item.title,
          sourceContent: item.contentSnippet,
        });

        const result = await groq.generate(prompt, { temperature: 0.5, maxTokens: 2048 });
        const article = parseArticleFromGroq(result.content, item.title);
        if (!article) { console.log(`   ⚠️ Parse failed: ${item.title.slice(0, 50)}`); continue; }

        const seo = scoreArticle(article.content, article.title, article.metaDescription, article.tags, article.wordCount, article.faqs.length);
        article.seoScore = seo.score;

        if (!shouldPublish(seo.score)) {
          console.log(`   ❌ SEO ${seo.score}: ${article.title.slice(0, 50)}`);
          continue;
        }

        const image = await fetchImage(article.tags[0] || article.category || 'AI');
        article.coverImage = image.imageUrl;

        if (dryRun) {
          console.log(`   📄 SEO ${seo.score}: ${article.slug}.mdx (DRY RUN)`);
          totalGenerated++;
          continue;
        }

        if (dbReady) {
          await addToQueue(article.title, 1, `rss:${feed.name}`, 0, 0, 30, 80);
          console.log(`   ✅ Queued: ${article.slug}`);
        } else {
          const pub = await publishArticle(article);
          if (pub.success) {
            console.log(`   ✅ Published: ${article.slug}.mdx`);
            totalGenerated++;
          } else {
            console.log(`   ❌ ${pub.error}`);
          }
        }
      } catch (err: any) {
        console.log(`   ❌ ${item.title.slice(0, 40)}: ${err.message.slice(0, 80)}`);
      }
    }
  }

  console.log(`\n📊 Done. ${totalGenerated} news articles ${dryRun ? 'simulated' : 'generated'}.`);
}

main().catch(console.error);

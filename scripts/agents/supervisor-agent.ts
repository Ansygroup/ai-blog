#!/usr/bin/env tsx
/**
 * SUPERVISOR AGENT
 * 
 * Usage:
 *   GROQ_API_KEY=gsk-... npx tsx scripts/agents/supervisor-agent.ts
 *   GROQ_API_KEY=gsk-... GROQ_API_KEY_2=gsk-... npx tsx scripts/agents/supervisor-agent.ts --batch 10
 * 
 * Flags:
 *   --batch N     Generate N articles (default: 5)
 *   --tier N      Only process specific tier (1-5)
 *   --news-only   Only process Tier 1 (news)
 *   --dry-run     Don't publish, just show what would happen
 *   --concurrency N  Parallel workers (default: 5)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });

import { getActiveGroqKeys, isDbReady } from '../../lib/db';
import { fetchNextBatch, distributeToWorkers } from '../../lib/queue';
import { GroqClient } from './groq-client';
import { scoreArticle, shouldPublish } from './quality/seo-scorer';
import { publishArticle, parseArticleFromGroq } from './publishing/publish-agent';
import { buildNewsPrompt } from './writers/templates/news-template';
import { buildSeoPrompt } from './writers/templates/seo-template';
import { buildAffiliatePrompt } from './writers/templates/affiliate-template';
import { fetchImage } from '../../lib/images';
import type { GenResult, Article } from '../../lib/types';

async function main() {
  const args = process.argv.slice(2);
  const batchSize = parseInt(args.find(a => a.startsWith('--batch='))?.split('=')[1] || '5', 10);
  const tierRaw = parseInt(args.find(a => a.startsWith('--tier='))?.split('=')[1] || '0', 10) || undefined;
  const tier = (tierRaw && [1,2,3,4,5].includes(tierRaw) ? tierRaw : undefined) as 1 | 2 | 3 | 4 | 5 | undefined;
  const newsOnly = args.includes('--news-only');
  const dryRun = args.includes('--dry-run');
  const concurrencyIdx = args.indexOf('--concurrency');
  const concurrency = concurrencyIdx >= 0 ? parseInt(args[concurrencyIdx + 1], 10) : parseInt(args.find(a => a.startsWith('--concurrency='))?.split('=')[1] || '5', 10);

  console.log(`\n🤖 SUPERVISOR AGENT v1.0\n`);
  console.log(`Batch: ${batchSize} | Concurrency: ${concurrency}${tier ? ` | Tier: ${tier}` : ''}${newsOnly ? ' | News Only' : ''}${dryRun ? ' | DRY RUN' : ''}`);

  // 1. Check DB
  const dbReady = isDbReady();
  console.log(`\n📦 Database: ${dbReady ? '✅ Supabase' : '⚠️ No Supabase (using local fallback)'}`);

  // 2. Get Groq keys
  const groqKeys = await getActiveGroqKeys();
  if (!groqKeys.length) {
    console.log('❌ No Groq API keys found. Set GROQ_API_KEY in .env.local');
    process.exit(1);
  }
  console.log(`🔑 Groq keys: ${groqKeys.length} available (${groqKeys.map(k => k.label || k.id).join(', ')})`);

  // 3. Fetch keywords from queue (or use demo keywords)
  const { items, totalPending } = await fetchNextBatch(tier, batchSize);
  let activeItems = items;
  let totalCount = totalPending;

  if (!items.length && !dbReady) {
    console.log('⚠️ No Supabase configured — running LOCAL DEMO MODE.\n');
    const demos = [
      { keyword: 'Best AI Coding Assistants 2026 Comparative Review', tier: 3 as const, vol: 8500, cpc: 4.20 },
      { keyword: 'How to Use n8n for AI Automation Workflows in 2026', tier: 4 as const, vol: 3200, cpc: 2.10 },
      { keyword: 'DeepSeek vs ChatGPT vs Claude 2026 Comparison', tier: 2 as const, vol: 12000, cpc: 3.50 },
    ];
    activeItems = demos.map((d, i) => ({
      id: `demo-${i}`, keyword: d.keyword, tier: d.tier,
      source: 'demo', search_volume: d.vol, cpc: d.cpc,
      difficulty: 40, opportunity: 85, status: 'pending' as const,
      created_at: new Date().toISOString(),
    }));
    totalCount = activeItems.length;
  } else if (!items.length && dbReady) {
    console.log('⚠️ No pending items in queue. Run ingestor agents first:');
    console.log('   npx tsx scripts/agents/queue/news-rss.ts');
    return;
  }

  console.log(`\n📋 Queue: ${totalCount} pending, processing ${activeItems.length} in this batch`);

  // 4. Build prompts
  const groq = new GroqClient(groqKeys);
  const tasks = activeItems.map(item => ({
    item,
    prompt: item.tier === 1 ? buildNewsPrompt({ keyword: item.keyword }) :
            item.tier === 5 ? buildAffiliatePrompt({ keyword: item.keyword }) :
            buildSeoPrompt({ keyword: item.keyword }),
  }));

  // 6. Generate in parallel
  console.log(`\n✍️  Generating ${tasks.length} articles (concurrency: ${concurrency})...\n`);
  const genResults: GenResult[] = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const batchPromises = batch.map(async ({ item, prompt }) => {
      try {
        const result = await groq.generate(prompt, { temperature: 0.7, maxTokens: 4096 });
        const article = parseArticleFromGroq(result.content, item.keyword);
        if (!article) return { success: false, error: 'Failed to parse Groq response', attempts: 1 } as GenResult;

        // Score article
        const seo = scoreArticle(article.content, article.title, article.metaDescription, article.tags, article.wordCount, article.faqs.length);
        article.seoScore = seo.score;

        console.log(`   ${article.title.slice(0, 60)}... → SEO Score: ${seo.score}`);

        if (!shouldPublish(seo.score)) {
          return { success: false, article, error: `SEO score ${seo.score} < 75`, attempts: 1 } as GenResult;
        }

        // Fetch image
        const imageTag = result.content.match(/IMAGE:\s*(.+)/)?.[1]?.trim() || article.tags[0] || 'AI';
        const image = await fetchImage(imageTag);
        article.coverImage = image.imageUrl;
        article.imageAttribution = image.attribution;

        if (dryRun) {
          console.log(`   📄 ${article.slug}.mdx (DRY RUN — not published)`);
          return { success: true, article } as GenResult;
        }

        // Publish
        const pubResult = await publishArticle(article, item.id);
        if (pubResult.success) {
          console.log(`   ✅ Published: ${article.slug}.mdx`);
          return { success: true, article } as GenResult;
        } else {
          console.log(`   ❌ Publish failed: ${pubResult.error}`);
          return { success: false, article, error: pubResult.error, attempts: 1 } as GenResult;
        }
      } catch (err: any) {
        console.log(`   ❌ ${item.keyword}: ${err.message}`);
        return { success: false, error: err.message, attempts: 1 } as GenResult;
      }
    });

    const results = await Promise.allSettled(batchPromises);
    for (const r of results) {
      if (r.status === 'fulfilled') {
        genResults.push(r.value);
        if (r.value.success) successCount++;
        else failCount++;
      }
    }
  }

  // 7. Summary
  console.log(`\n📊 BATCH SUMMARY`);
  console.log(`   ✅ Published: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📝 Total articles in queue still pending: ${totalCount - activeItems.length + (activeItems.length - successCount)}`);
  console.log(`\nDone. ${dryRun ? '(DRY RUN — no files written)' : ''}`);
}

main().catch(console.error);

#!/usr/bin/env tsx
/**
 * SUPERVISOR AGENT v2.0
 *
 * Usage:
 *   GROQ_API_KEY=gsk-... npx tsx scripts/agents/supervisor-agent.ts
 *   GROQ_API_KEY=gsk-... GROQ_API_KEY_2=gsk-... npx tsx scripts/agents/supervisor-agent.ts --batch 10
 *
 * Flags:
 *   --batch N         Articles to generate (default: 5)
 *   --tier N          Only process specific tier (1-5)
 *   --news-only       Only Tier 1 (news)
 *   --dry-run         Don't publish
 *   --concurrency N   Parallel workers (default: 3)
 *   --demo            Use demo keywords (for testing only)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });

import { getActiveGroqKeys, isDbReady } from '../../lib/db';
import { fetchNextBatch } from '../../lib/queue';
import { GroqClient } from './groq-client';
import { scoreArticle, shouldPublish } from './quality/seo-scorer';
import { publishArticle, parseArticleFromGroq } from './publishing/publish-agent';
import { buildNewsPrompt } from './writers/templates/news-template';
import { buildSeoPrompt } from './writers/templates/seo-template';
import { buildAffiliatePrompt } from './writers/templates/affiliate-template';
import { fetchImage } from '../../lib/images';
import { execSync } from 'child_process';
import type { GenResult, Article } from '../../lib/types';

function getArg(args: string[], name: string, def: string): string {
  const idx = args.indexOf(name);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  const eq = args.find(a => a.startsWith(`--${name}=`));
  return eq?.split('=')[1] || def;
}

async function main() {
  const args = process.argv.slice(2);
  const batchSize = parseInt(getArg(args, 'batch', '5'), 10);
  const tierRaw = parseInt(getArg(args, 'tier', '0'), 10);
  const tier = (tierRaw >= 1 && tierRaw <= 5 ? tierRaw : undefined) as 1 | 2 | 3 | 4 | 5 | undefined;
  const newsOnly = args.includes('--news-only');
  const dryRun = args.includes('--dry-run');
  const demo = args.includes('--demo');
  const concurrency = parseInt(getArg(args, 'concurrency', '3'), 10);

  console.log(`\n🤖 SUPERVISOR AGENT v2.0\n`);
  console.log(`Batch: ${batchSize} | Concurrency: ${concurrency}${tier ? ` | Tier: ${tier}` : ''}${newsOnly ? ' | News Only' : ''}${dryRun ? ' | DRY RUN' : ''}${demo ? ' | DEMO MODE' : ''}`);

  const dbReady = isDbReady();
  console.log(`\n📦 Database: ${dbReady ? '✅ Supabase' : '⚠️ No Supabase (local mode)'}`);

  const groqKeys = await getActiveGroqKeys();
  if (!groqKeys.length) { console.log('❌ No Groq API keys found.'); process.exit(1); }
  console.log(`🔑 Groq keys: ${groqKeys.length} available`);

  // Fetch queue or demo items
  let activeItems: any[] = [];
  let totalCount = 0;

  if (demo) {
    const demos = [
      { keyword: 'Latest AI Research Breakthroughs June 2026 — Deep Learning Advances', tier: 2 as const, vol: 4500, cpc: 1.8 },
      { keyword: 'How to Build a RAG Pipeline with LangChain and Supabase in 2026', tier: 4 as const, vol: 6200, cpc: 3.2 },
      { keyword: 'Claude 4 vs GPT-5 vs Gemini 3 — Enterprise AI Model Comparison 2026', tier: 3 as const, vol: 15000, cpc: 4.5 },
      { keyword: 'Best AI Tools for Video Editing and Generation in 2026', tier: 2 as const, vol: 8800, cpc: 2.9 },
      { keyword: 'OpenAI o3 Release — Everything You Need to Know', tier: 1 as const, vol: 25000, cpc: 1.5 },
    ];
    activeItems = demos.map((d, i) => ({
      id: `demo-${i}`, keyword: d.keyword, tier: d.tier, source: 'demo',
      search_volume: d.vol, cpc: d.cpc, difficulty: 35, opportunity: 90,
      status: 'pending' as const, created_at: new Date().toISOString(),
    }));
    totalCount = activeItems.length;
  } else {
    const result = await fetchNextBatch(tier, batchSize);
    activeItems = result.items;
    totalCount = result.totalPending;
    if (!activeItems.length) {
      console.log('⚠️ Queue empty. --demo for testing or run RSS ingestor first.');
      process.exit(0);
    }
  }

  console.log(`\n📋 Queue: ${totalCount} pending, processing ${activeItems.length}`);

  // Build prompts
  const groq = new GroqClient(groqKeys);
  const tasks = activeItems.map(item => ({
    item,
    prompt: item.tier === 1 ? buildNewsPrompt({ keyword: item.keyword }) :
            item.tier === 5 ? buildAffiliatePrompt({ keyword: item.keyword }) :
            buildSeoPrompt({ keyword: item.keyword }),
  }));

  // Generate
  console.log(`\n✍️  Generating ${tasks.length} articles (concurrency: ${concurrency})...\n`);
  const genResults: GenResult[] = [];
  let successCount = 0;
  let failCount = 0;

  // Process with concurrency limit
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const batchPromises = batch.map(async ({ item, prompt }) => {
      const start = Date.now();
      try {
        const result = await groq.generate(prompt, { temperature: 0.65, maxTokens: 4096 });
        const article = parseArticleFromGroq(result.content, item.keyword);
        if (!article) return { success: false, error: 'Parse failed', attempts: 1 } as GenResult;

        const seo = scoreArticle(article.content, article.title, article.metaDescription, article.tags, article.wordCount, article.faqs.length);
        article.seoScore = seo.score;

        if (!shouldPublish(seo.score)) {
          const elapsed = ((Date.now() - start) / 1000).toFixed(1);
          console.log(`   ⏭️  SEO ${seo.score} ${article.title.slice(0, 50)}... (${elapsed}s)`);
          return { success: false, article, error: `SEO ${seo.score} < 75` } as GenResult;
        }

        const imageTag = result.content.match(/^IMAGE:\s*(.+)/m)?.[1]?.trim() || article.tags[0] || 'AI technology';
        const image = await fetchImage(imageTag);
        article.coverImage = image.imageUrl;

        if (dryRun) {
          console.log(`   📄 SEO ${seo.score} ${article.slug}.mdx (${((Date.now() - start) / 1000).toFixed(1)}s)`);
          return { success: true, article } as GenResult;
        }

        const pub = await publishArticle(article, item.id);
        if (pub.success && pub.slug) {
          try {
            execSync(`node "${path.join(__dirname, '..', 'humanize-post.js')}" "${pub.slug}"`, {
              stdio: 'pipe', timeout: 60000, env: { ...process.env, GROQ_API_KEY: groqKeys[0].key_value },
            });
          } catch { /* humanization is non-fatal */ }
        }
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        if (pub.success) {
          console.log(`   ✅ SEO ${seo.score} ${article.slug}.mdx (${elapsed}s)`);
          return { success: true, article } as GenResult;
        } else {
          console.log(`   ❌ ${pub.error} (${elapsed}s)`);
          return { success: false, article, error: pub.error } as GenResult;
        }
      } catch (err: any) {
        console.log(`   ❌ ${item.keyword.slice(0, 50)}: ${err.message.slice(0, 100)}`);
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

  // Trigger ISR revalidation
  if (successCount > 0 && !dryRun) {
    const secret = process.env.REVALIDATION_SECRET;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    if (secret) {
      try {
        await fetch(`${baseUrl}/api/revalidate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret, paths: ['/news', '/posts', '/'] }),
        });
        console.log(`   🔄 ISR revalidation triggered`);
      } catch { /* non-fatal */ }
    }
  }

  console.log(`\n📊 BATCH SUMMARY`);
  console.log(`   ✅ Published: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📝 Queue remaining: ${Math.max(0, totalCount - activeItems.length + (activeItems.length - successCount))}`);
  console.log(`\nDone.`);
}

main().catch(console.error);

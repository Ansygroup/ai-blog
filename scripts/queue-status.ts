#!/usr/bin/env tsx
/**
 * scripts/queue-status.ts
 *
 * Shows current queue state and recent activity.
 *
 * Usage:   npx tsx scripts/queue-status.ts
 *          npx tsx scripts/queue-status.ts --topics   (show top 10 pending topics)
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { isDbReady, countQueue, getQueueItems } from '../lib/db';
import { getAllPosts } from '../lib/posts';

async function main() {
  const args = process.argv.slice(2);
  const showTopics = args.includes('--topics') || args.includes('-t');
  const dbReady = isDbReady();

  console.log(`\n📊 QUEUE STATUS\n`);

  // Published posts
  const allPosts: any[] = getAllPosts() || [];
  const posts = allPosts.filter(Boolean);
  const byCategory: Record<string, number> = {};
  for (const p of posts) {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
  }
  console.log(`📝 Published posts: ${posts.length}`);
  for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${cat}: ${count}`);
  }

  // DB queue
  if (dbReady) {
    const pending = await countQueue('pending');
    const published = await countQueue('published');
    const failed = await countQueue('failed');
    console.log(`\n🗄️  Supabase queue:`);
    console.log(`   Pending:    ${pending}`);
    console.log(`   Published:  ${published}`);
    console.log(`   Failed:     ${failed}`);

    if (showTopics && pending > 0) {
      const items = await getQueueItems(10);
      console.log(`\n📋 Top pending topics:`);
      for (const item of items) {
        const tierLabel = ['', 'News', 'Listicle', 'Comparison', 'Tutorial', 'Affiliate'];
        console.log(`   [T${item.tier} ${tierLabel[item.tier] || '?'}] ${item.keyword.slice(0, 70)} (opp: ${item.opportunity})`);
      }
    }
  } else {
    console.log(`\n⚠️  No Supabase — running in local-only mode`);
    console.log(`   Queue features require NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_KEY`);
    console.log(`   Local generation still works via --demo flag`);
  }

  // Groq keys
  const keyCount = [1,2,3,4,5].filter(i => process.env[`GROQ_API_KEY${i > 1 ? '_' + i : ''}`]).length;
  console.log(`\n🔑 Groq keys: ${keyCount} configured`);

  // Latest articles
  const recent: any[] = posts.slice(0, 5);
  console.log(`\n🆕 Latest articles:`);
  for (const p of recent) {
    const seo = p.seoScore || '?';
    console.log(`   ${p.date} [SEO ${seo}] ${(p.title || '').slice(0, 55)}`);
  }

  console.log(``);
}

main().catch(console.error);

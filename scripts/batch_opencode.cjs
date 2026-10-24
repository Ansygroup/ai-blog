#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const QUEUE_PATH = path.join(__dirname, 'keyword-queue.json');
const POSTS_DIR = path.join(ROOT, 'content', 'posts');
const OPENCODE = 'C:/Users/ansy0/AppData/Roaming/npm/opencode.cmd';

const args = process.argv.slice(2);
const BATCH_SIZE = parseInt(args[args.indexOf('--batch') + 1] || '5', 10);
const MODEL = args[args.indexOf('--model') + 1] || 'opencode/deepseek-v4.1-flash-free';

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function generateCoverImage(slug) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(slug.replace(/-/g, ' '))}?width=1200&height=630&model=flux&nologo=true`;
  const outPath = path.join(ROOT, 'public', 'images', `${slug}.jpg`);
  if (fs.existsSync(outPath)) return outPath;
  try {
    const { execSync } = require('child_process');
    execSync(`curl -s -o "${outPath}" "${url}"`, { timeout: 30000 });
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) return outPath;
  } catch (e) {}
  return null;
}

function generateArticle(topic, category, keywords) {
  const prompt = `Write a comprehensive SEO-optimized blog post about: "${topic}"

Category: ${category}
Keywords: ${keywords.join(', ')}

Requirements:
- Title: catchy, SEO-optimized, includes main keyword
- Write 1200-1500 words
- Use markdown with H2 and H3 headings
- Include an introduction, 4-6 main sections, and conclusion
- Include practical examples and actionable advice
- Write in English
- Professional but accessible tone

Output ONLY the article content in markdown format (no frontmatter, no code blocks).`;

  try {
    const result = spawnSync(OPENCODE, ['run', '--model', MODEL], {
      input: prompt,
      timeout: 180000,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Exit code ${result.status}: ${result.stderr?.slice(0, 200)}`);
    const lines = (result.stdout || '').split('\n');
    const contentLines = lines.filter(l => !l.startsWith('>') && !l.startsWith('build'));
    return contentLines.join('\n').trim();
  } catch (e) {
    console.error(`  ❌ Error: ${e.message.slice(0, 100)}`);
    return null;
  }
}

async function main() {
  const queue = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
  const toProcess = queue.slice(0, BATCH_SIZE);
  const remaining = queue.slice(BATCH_SIZE);

  console.log(`📋 Processing ${toProcess.length} of ${queue.length} topics`);
  console.log(`🤖 Model: ${MODEL}\n`);

  let generated = 0;
  let failed = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const item = toProcess[i];
    const topic = item.topic;
    const category = item.category || 'General';
    const keywords = item.keywords || [];
    const slug = slugify(topic);

    console.log(`[${i + 1}/${toProcess.length}] ${topic.slice(0, 60)}...`);

    const postPath = path.join(POSTS_DIR, `${slug}.mdx`);
    if (fs.existsSync(postPath)) {
      console.log('  ⏭️  Already exists, skipping');
      continue;
    }

    const content = generateArticle(topic, category, keywords);
    if (!content || content.length < 200) {
      console.log('  ❌ Failed to generate');
      failed++;
      continue;
    }

    const frontmatter = `---
title: "${topic.replace(/"/g, '\\"')}"
date: "${new Date().toISOString().split('T')[0]}"
category: "${category}"
description: "${topic.slice(0, 160).replace(/"/g, '\\"')}"
---\n\n`;

    fs.writeFileSync(postPath, frontmatter + content);
    console.log(`  ✅ Written: ${slug}.mdx (${content.length} chars)`);

    const imgPath = generateCoverImage(slug);
    if (imgPath) console.log(`  🖼️  Cover: ${slug}.jpg`);

    generated++;
  }

  fs.writeFileSync(QUEUE_PATH, JSON.stringify(remaining, null, 2));
  console.log(`\n📊 Generated: ${generated}, Failed: ${failed}, Remaining: ${remaining.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });

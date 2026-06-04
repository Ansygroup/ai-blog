#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const QUEUE_PATH = path.join(__dirname, 'keyword-queue.json');

const CATEGORY_ROTATION = ['Reviews', 'Comparisons', 'Best Of', 'Tutorials', 'Comparisons', 'Reviews', 'Best Of'];
const apiKey = process.env.GROQ_API_KEY;

function getQueue() {
  if (!fs.existsSync(QUEUE_PATH)) return [];
  return JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
}

function getTopicsByCategory(category) {
  const queue = getQueue();
  return queue.filter(t => t.category === category);
}

function getDayCategory() {
  const day = new Date().getDay(); // 0=Sun, 1=Mon...
  return CATEGORY_ROTATION[day] || 'Reviews';
}

function getDailyCount() {
  const existing = fs.readdirSync(POSTS_DIR).filter(f => {
    const c = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8');
    const today = new Date().toISOString().split('T')[0];
    return c.includes(`date: ${today}`);
  });
  return existing.length;
}

(async () => {
  const todayCat = getDayCategory();
  const dailyCount = getDailyCount();
  const topics = getTopicsByCategory(todayCat);

  console.log('=== Content Scheduler ===');
  console.log(`Day: ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()]}`);
  console.log(`Today's category: ${todayCat}`);
  console.log(`Posts generated today: ${dailyCount}`);
  console.log(`Available topics in "${todayCat}": ${topics.length}`);

  if (topics.length === 0) {
    const otherCats = [];
    for (const cat of [...new Set(CATEGORY_ROTATION)]) {
      const t = getTopicsByCategory(cat);
      if (t.length > 0) otherCats.push({ cat, count: t.length });
    }
    if (otherCats.length > 0) {
      const best = otherCats.sort((a, b) => b.count - a.count)[0];
      console.log(`  No topics for ${todayCat} — falling back to ${best.cat} (${best.count} topics)`);
    } else {
      console.log('  Queue is empty across all categories.');
      console.log('  Run: node scripts/content-strategy.js --fill-queue');
    }
  }

  // Show next 5 topics in queue for today's category
  console.log('\nNext up:');
  for (const t of topics.slice(0, 5)) {
    console.log(`  [${t.category}] ${t.topic}`);
  }

  console.log(`\nQueue total: ${getQueue().length} topics`);
})();

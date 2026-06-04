import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import { siteConfig } from '../lib/config';

const TAG = process.env.AMAZON_ASSOCIATES_TAG || 'ansy07-20';

const CATEGORY_KEYWORDS = {
  laptops: ['laptop', 'macbook', 'notebook', 'developer', 'programming', 'coding', 'computer', 'workstation'],
  headphones: ['headphone', 'earphone', 'earbuds', 'audio', 'noise cancelling', 'music', 'podcast'],
  monitors: ['monitor', 'display', 'screen', 'desk setup', 'coding', 'programming', 'ultrawide'],
  'ai-books': ['book', 'reading', 'learn', 'guide', 'artificial intelligence', 'machine learning'],
  webcams: ['webcam', 'camera', 'streaming', 'video', 'microphone', 'creator', 'youtube'],
  tablets: ['tablet', 'ipad', 'kindle', 'ereader', 'note taking', 'reading'],
  'smart-home': ['smart home', 'alexa', 'google home', 'automation', 'thermostat', 'echo', 'nest'],
  storage: ['ssd', 'storage', 'hard drive', 'nvme', 'nas', 'backup', 'external drive'],
  keyboards: ['keyboard', 'mouse', 'mechanical', 'peripheral', 'ergonomic', 'typing', 'keychron', 'logitech'],
  'office-chairs': ['chair', 'ergonomic', 'office', 'desk', 'sitting', 'back pain', 'posture', 'aeron', 'gesture'],
};

function getDb() {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts', 'amazon-db.json'), 'utf8'));
  } catch { return { categories: {} }; }
}

function getMatchScore(postTags, postCategory) {
  const allText = [postCategory, ...(postTags || [])].join(' ').toLowerCase();
  const scores = [];
  for (const [catSlug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (allText.includes(kw)) score++;
    }
    if (score > 0) scores.push({ slug: catSlug, score });
  }
  return scores.sort((a, b) => b.score - a.score).slice(0, 2);
}

export default function RelatedProducts({ tags, category, limit = 3 }) {
  const db = getDb();
  const matches = getMatchScore(tags, category);
  if (matches.length === 0) return null;

  let products = [];
  for (const match of matches) {
    const cat = db.categories[match.slug];
    if (cat) products.push(...cat.products.slice(0, 2));
    if (products.length >= limit) break;
  }
  products = products.slice(0, limit);
  if (products.length === 0) return null;

  return (
    <div className="mt-10 pt-6 border-t border-slate-200 dark:border-dark-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">🛒 Shop Related Gear</h3>
        <Link href="/recommendations" className="text-xs text-blue-600 hover:underline">View all →</Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {products.map((p) => {
          const url = `https://www.amazon.com/dp/${p.asin}?tag=${TAG}`;
          return (
            <a key={p.asin} href={url} target="_blank" rel="noopener sponsored" className="flex items-center gap-3 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border hover:border-blue-400 rounded-lg p-3 transition group">
              <img src={p.image} alt={p.name} width={64} height={64} className="rounded-lg object-cover flex-shrink-0" loading="lazy" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-dark-text truncate group-hover:text-blue-600 transition">{p.name}</p>
                <p className="text-xs text-slate-500 dark:text-dark-muted">${p.price} · {p.rating}★</p>
              </div>
            </a>
          );
        })}
      </div>
      <p className="text-xs text-slate-400 mt-2">As an Amazon Associate we earn from qualifying purchases.</p>
    </div>
  );
}

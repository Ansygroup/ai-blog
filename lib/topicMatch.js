import { topics } from './topics';

// Match a post to its best topic hub by tag/category overlap. Returns null on no match.
export function topicForPost(post) {
  const hay = [post.category, ...(post.tags || [])].filter(Boolean).map((s) => String(s).toLowerCase());
  let best = null, bestScore = 0;
  for (const t of topics) {
    const score = t.tags.reduce((n, tag) => n + (hay.some((h) => h === tag.toLowerCase() || h.includes(tag.toLowerCase()) || tag.toLowerCase().includes(h)) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; best = t; }
  }
  return bestScore >= 1 ? best : null;
}

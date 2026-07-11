import fs from 'fs';
import path from 'path';
import { getPostBySlug, getAllPosts } from './posts';

const seriesPath = path.join(process.cwd(), 'data', 'series.json');

export function getAllSeries() {
  try {
    if (!fs.existsSync(seriesPath)) return [];
    return JSON.parse(fs.readFileSync(seriesPath, 'utf8'));
  } catch {
    return [];
  }
}

export function getSeriesBySlug(slug) {
  return getAllSeries().find(s => s.slug === slug) || null;
}

export function getSeriesForPost(postSlug) {
  return getAllSeries().filter(s => s.posts.includes(postSlug));
}

export function getSeriesWithPosts(slug) {
  const series = getSeriesBySlug(slug);
  if (!series) return null;
  return {
    ...series,
    posts: series.posts.map(slug => getPostBySlug(slug)).filter(Boolean),
  };
}

export function getSeriesNavigation(postSlug) {
  const series = getAllSeries().filter(s => s.posts.includes(postSlug));
  return series.map(s => {
    const idx = s.posts.indexOf(postSlug);
    return {
      series: s,
      index: idx,
      total: s.posts.length,
      prev: idx > 0 ? getPostBySlug(s.posts[idx - 1]) : null,
      next: idx < s.posts.length - 1 ? getPostBySlug(s.posts[idx + 1]) : null,
    };
  });
}

export function saveSeries(series) {
  fs.writeFileSync(seriesPath, JSON.stringify(series, null, 2), 'utf8');
}

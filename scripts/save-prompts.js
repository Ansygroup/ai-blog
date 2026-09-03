#!/usr/bin/env node
/**
 * save-prompts.js — cache magazine-quality prompts for every post to disk.
 *
 * Useful as a backup: if image generation pauses or crashes, you can resume
 * later with covergen --resume. Each post gets a JSON file with its archetype,
 * palette, headline, and full prompt.
 */
import fs from 'node:fs';
import path from 'node:path';
import { buildMagazinePrompt } from './prompt-builder.js';

const ROOT = process.cwd();
const POSTS = path.join(ROOT, 'content', 'posts');
const IMG = path.join(ROOT, 'public', 'images');
const CACHE = path.join(ROOT, '.prompts-cache');

if (!fs.existsSync(CACHE)) fs.mkdirSync(CACHE, { recursive: true });

function readFrontmatter(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const fm = raw.split(/---\r?\n/)[1] || '';
  const get = (k) => {
    const m = fm.match(new RegExp(`^${k}:\\s*['"]?(.*?)['"]?\\s*$`, 'm'));
    return m ? m[1].trim() : '';
  };
  const getArray = (k) => {
    const m = fm.match(new RegExp(`^${k}:\\s*$`, 'm'));
    if (!m) return [];
    const start = fm.indexOf('\n', m.index) + 1;
    const lines = fm.slice(start).split('\n');
    const out = [];
    for (const line of lines) {
      if (!line.trim() || line.trim().startsWith('-')) continue;
      if (line.startsWith('---')) break;
      const item = line.replace(/^[-•]\s*/, '').replace(/['"]/g, '').trim();
      if (item) out.push(item);
    }
    return out;
  };
  const title = get('title');
  const category = get('category');
  const cover = get('cover');
  const excerpt = get('excerpt') || get('description');
  const tags = getArray('tags');
  const slugMatch = file.match(/([^\\/]+)\.mdx$/);
  const slug = slugMatch ? slugMatch[1] : '';
  const rawNoFm = raw.replace(/^---[\s\S]*?---\s*/, '');
  const body = rawNoFm
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\|.*$/gm, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1200);
  return { title, category, cover, slug, excerpt, tags, body };
}

function main() {
  const files = fs.readdirSync(POSTS).filter((f) => f.endsWith('.mdx'));
  let saved = 0;
  for (const f of files) {
    const fm = readFrontmatter(path.join(POSTS, f));
    if (!fm.slug || !fm.cover || fm.cover.startsWith('http')) continue;
    const outFile = path.join(IMG, path.basename(fm.cover));
    const cacheFile = path.join(CACHE, `${fm.slug}.json`);
    const built = buildMagazinePrompt(fm);
    const data = {
      slug: fm.slug,
      title: fm.title,
      category: fm.category,
      tags: fm.tags,
      cover: fm.cover,
      outFile: outFile.replace(/\\/g, '/'),
      imageExists: fs.existsSync(outFile),
      archetype: built.archetype,
      paletteKey: built.paletteKey,
      headline: built.headline,
      subject: built.subject,
      prompt: built.prompt,
      cachedAt: new Date().toISOString(),
    };
    fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
    saved++;
  }
  console.log(`[save-prompts] cached ${saved} posts to ${CACHE}`);
}

main();

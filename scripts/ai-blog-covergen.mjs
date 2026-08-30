#!/usr/bin/env node
/**
 * ai-blog-covergen — regenerate every post cover with an OPEN-SOURCE, locally-run
 * image model (no paid API). CPU-only by design (this host has no GPU).
 *
 * Pipeline:
 *   read content/posts/*.mdx  (frontmatter: title, category, slug)
 *     -> build a clean EN prompt from title+category
 *     -> call the Python generator (diffusers SDXL-Turbo, 1-step, 1024x512)
 *     -> write public/images/<slug>.jpg OVER the existing cover (idempotent)
 *
 * Modes:
 *   (default)  regenerate ALL posts whose cover file is older than this run OR missing
 *   --slug X   only one post (smoke test)
 *   --force    regenerate every post regardless
 *   --dry      list what WOULD be generated, no writes
 *
 * Safe: never touches frontmatter; only overwrites the image file at the path the
 * post already declares. If a post's cover path is external (http), it is skipped
 * (flagged) so we don't break remote assets.
 *
 * Run from repo root. Requires the python venv at .venv-img (see setup step).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const POSTS = path.join(ROOT, 'content', 'posts');
const IMG = path.join(ROOT, 'public', 'images');
const PY = path.join(ROOT, '.venv-img', 'Scripts', 'python.exe');
const GEN = path.join(ROOT, 'scripts', 'covergen_worker.py');

const args = process.argv.slice(2);
const onlySlug = args.find((a) => a === '--slug') ? args[args.indexOf('--slug') + 1] : null;
const force = args.includes('--force');
const dry = args.includes('--dry');

function readFrontmatter(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const fm = raw.split(/---\r?\n/)[1] || '';
  const get = (k) => {
    const m = fm.match(new RegExp(`^${k}:\\s*['"]?(.*?)['"]?\\s*$`, 'm'));
    return m ? m[1].trim() : '';
  };
  const title = get('title');
  const category = get('category');
  const cover = get('cover');
  const slugMatch = file.match(/([^\\/]+)\.mdx$/);
  const slug = slugMatch ? slugMatch[1] : '';
  return { title, category, cover, slug };
}

function buildPrompt(title, category) {
  const cat = (category || 'technology').toLowerCase();
  const base =
    'cinematic editorial blog cover, clean modern flat illustration, ' +
    'professional AI/tech magazine aesthetic, soft gradient background, ' +
    'minimal geometric shapes suggesting the topic, no text, no watermark, ' +
    'high contrast, vibrant but tasteful palette';
  const topic = (title || '').slice(0, 80).replace(/[[\](){}]/g, '').trim();
  return `${base}, subject: ${topic}, category: ${cat}`;
}

function main() {
  if (!fs.existsSync(PY)) {
    console.error('[covergen] venv missing at .venv-img — run setup first');
    process.exit(1);
  }
  if (!fs.existsSync(GEN)) {
    console.error('[covergen] worker missing at scripts/covergen_worker.py');
    process.exit(1);
  }

  const files = fs.readdirSync(POSTS).filter((f) => f.endsWith('.mdx'));
  const plan = [];
  for (const f of files) {
    const fm = readFrontmatter(path.join(POSTS, f));
    if (!fm.slug) continue;
    if (onlySlug && fm.slug !== onlySlug) continue;
    if (!fm.cover) {
      plan.push({ ...fm, action: 'SKIP_NO_COVER' });
      continue;
    }
    if (fm.cover.startsWith('http')) {
      plan.push({ ...fm, action: 'SKIP_EXTERNAL' });
      continue;
    }
    const outFile = path.join(IMG, path.basename(fm.cover));
    const exists = fs.existsSync(outFile);
    if (!force && exists) {
      plan.push({ ...fm, action: 'OK_EXISTS' });
      continue;
    }
    plan.push({ ...fm, action: 'GEN', outFile, prompt: buildPrompt(fm.title, fm.category) });
  }

  const toGen = plan.filter((p) => p.action === 'GEN');
  console.log(
    `[covergen] posts=${files.length} gen=${toGen.length} skip_external=${plan.filter((p) => p.action === 'SKIP_EXTERNAL').length} skip_no_cover=${plan.filter((p) => p.action === 'SKIP_NO_COVER').length} exists=${plan.filter((p) => p.action === 'OK_EXISTS').length}`
  );

  if (dry) {
    toGen.slice(0, 10).forEach((p) => console.log('  WOULD GEN', p.slug, '->', p.outFile));
    console.log('[covergen] dry run, no writes');
    return;
  }

  let done = 0;
  let fail = 0;
  for (const p of toGen) {
    try {
      execFileSync(PY, [GEN, '--out', p.outFile, '--prompt', p.prompt], { stdio: 'pipe' });
      if (fs.existsSync(p.outFile)) {
        done++;
        if (done % 25 === 0) console.log(`[covergen] progress ${done}/${toGen.length}`);
      } else {
        fail++;
        console.error('[covergen] FAIL (no output) ', p.slug);
      }
    } catch (e) {
      fail++;
      console.error('[covergen] FAIL', p.slug, String(e.stderr || e.message).slice(-200));
    }
  }
  console.log(`[covergen] DONE generated=${done} failed=${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main();

#!/usr/bin/env node
/**
 * ai-blog-covergen — regenerate every post cover via Pollinations (Flux).
 *
 * Pipeline:
 *   read content/posts/*.mdx
 *     -> extract title/category/excerpt/tags
 *     -> build magazine-quality prompt (scripts/prompt-builder.js)
 *     -> call covergen_flux.py (Pollinations Flux, free, no key)
 *     -> write public/images/<slug>.jpg
 *
 * Modes:
 *   (default)  regenerate ALL posts whose cover is missing/older
 *   --slug X   only one post
 *   --force    regenerate every post regardless of existing
 *   --batch N  only generate the first N pending
 *   --dry      show what would be generated, no writes
 *   --backend flux|local  choose backend (default flux)
 *
 * Safe: never touches frontmatter; only overwrites the image at the path the
 * post already declares. External (http) covers are skipped.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildMagazinePrompt } from './prompt-builder.js';

const ROOT = process.cwd();
const POSTS = path.join(ROOT, 'content', 'posts');
const IMG = path.join(ROOT, 'public', 'images');
const PY = path.join(ROOT, '.venv-img', 'Scripts', 'python.exe');
const FLUX_WORKER = path.join(ROOT, 'scripts', 'covergen_flux.py');
const LOCAL_WORKER = path.join(ROOT, 'scripts', 'covergen_worker.py');
const SIZE = '1024x1280';

const args = process.argv.slice(2);
const onlySlug = args.find((a) => a === '--slug') ? args[args.indexOf('--slug') + 1] : null;
const force = args.includes('--force');
const dry = args.includes('--dry');
const batchIdx = args.indexOf('--batch');
const batch = batchIdx !== -1 ? parseInt(args[batchIdx + 1], 10) : Infinity;
const backend = (args.find((a) => a === '--backend') && args[args.indexOf('--backend') + 1]) || 'flux';

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
  // pull a chunk of body text so prompt builder can see real content
  const rawNoFm = raw.replace(/^---[\s\S]*?---\s*/, '');
  const body = rawNoFm
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // strip [text](url)
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
  const worker = backend === 'local' ? LOCAL_WORKER : FLUX_WORKER;
  if (!fs.existsSync(PY)) {
    console.error('[covergen] venv missing at .venv-img — run setup first');
    process.exit(1);
  }
  if (!fs.existsSync(worker)) {
    console.error('[covergen] worker missing:', worker);
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
    const built = buildMagazinePrompt(fm);
    plan.push({
      ...fm,
      action: 'GEN',
      outFile,
      prompt: built.prompt,
      archetype: built.archetype,
      paletteKey: built.paletteKey,
      headline: built.headline,
    });
  }

  const toGen = plan.filter((p) => p.action === 'GEN').slice(0, batch);
  console.log(
    `[covergen] backend=${backend} posts=${files.length} pending=${plan.filter((p) => p.action === 'GEN').length} this_batch=${toGen.length} skip_external=${plan.filter((p) => p.action === 'SKIP_EXTERNAL').length} skip_no_cover=${plan.filter((p) => p.action === 'SKIP_NO_COVER').length} exists=${plan.filter((p) => p.action === 'OK_EXISTS').length}`
  );

  if (dry) {
    toGen.slice(0, 10).forEach((p) =>
      console.log(`  WOULD GEN [${p.archetype}/${p.paletteKey}] ${p.slug} "${p.headline.join(' ')}" -> ${path.basename(p.outFile)}`)
    );
    console.log('[covergen] dry run, no writes');
    return;
  }

  let done = 0;
  let fail = 0;
  for (const p of toGen) {
    try {
      const seed = Math.abs(hashStr(p.slug + p.title)) % (2 ** 31);
      const cmd = backend === 'local' ? LOCAL_WORKER : FLUX_WORKER;
      const argsArr = backend === 'local'
        ? [cmd, '--out', p.outFile, '--prompt', p.prompt, '--size', SIZE, '--seed', String(seed)]
        : [cmd, '--out', p.outFile, '--prompt', p.prompt, '--size', SIZE, '--seed', String(seed)];
      execFileSync(PY, argsArr, { stdio: 'pipe' });
      if (fs.existsSync(p.outFile)) {
        done++;
        if (done % 5 === 0) console.log(`[covergen] progress ${done}/${toGen.length}`);
      } else {
        fail++;
        console.error('[covergen] FAIL (no output)', p.slug);
      }
    } catch (e) {
      fail++;
      console.error('[covergen] FAIL', p.slug, String(e.stderr || e.message).slice(-200));
      // log to a separate failures file so we can retry later
      try {
        fs.appendFileSync(path.join(ROOT, '.prompts-cache', 'failures.log'),
          `${p.slug}\t${p.archetype}\t${p.paletteKey}\n`);
      } catch {}
    }
  }
  console.log(`[covergen] DONE generated=${done} failed=${fail} batch_cap=${batch === Infinity ? 'all' : batch}`);
  process.exit(fail > 0 && done === 0 ? 1 : 0);
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

main();

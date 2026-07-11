import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');
const CANONICAL_TAGS_PATH = path.join(process.cwd(), 'scripts', 'normalize-tags.js');

function loadPosts() {
  return fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx')).map(f => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8').replace(/\r\n/g, '\n');
    const slug = f.replace(/\.mdx$/, '');
    const match = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;
    const fm = match[1];
    const title = (fm.match(/^title:\s*"(.+?)"/m) || [])[1] || (fm.match(/^title:\s*'(.+?)'/m) || [])[1] || slug;
    const tagsMatch = fm.match(/^tags:\s*\[([^\]]*)\]/m);
    const tags = tagsMatch ? tagsMatch[1].split(',').map(t => t.trim().replace(/['"]/g, '')).filter(Boolean) : [];
    return { slug, title, tags };
  }).filter(Boolean);
}

function getCanonicalTags() {
  try {
    const content = fs.readFileSync(CANONICAL_TAGS_PATH, 'utf8');
    const match = content.match(/const CANONICAL_TAGS = new Set\(\[\n([\s\S]*?)\n\]\)/);
    if (match) {
      return match[1].split('\n').map(l => l.replace(/^\s*'|',?\s*$/g, '').trim()).filter(Boolean);
    }
  } catch {}
  return [];
}

export async function GET() {
  try {
    const posts = loadPosts();
    const tagMap = {};
    const untagged = [];

    posts.forEach(p => {
      if (!p.tags || p.tags.length === 0) {
        untagged.push({ slug: p.slug, title: p.title });
        return;
      }
      p.tags.forEach(t => {
        if (!tagMap[t]) tagMap[t] = [];
        tagMap[t].push({ slug: p.slug, title: p.title });
      });
    });

    const tagEntries = Object.entries(tagMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tag, taggedPosts]) => ({
        tag,
        count: taggedPosts.length,
        posts: taggedPosts,
      }));

    const canonicalTags = getCanonicalTags();

    return Response.json({
      tags: tagEntries,
      totalTags: tagEntries.length,
      totalPosts: posts.length,
      untagged: untagged.length,
      canonicalTags,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { action, fromTag, toTag, newTag } = await req.json();

    if (action === 'merge') {
      if (!fromTag || !toTag) {
        return Response.json({ error: 'fromTag and toTag required' }, { status: 400 });
      }

      const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
      let modified = 0;

      for (const file of files) {
        const filePath = path.join(POSTS_DIR, file);
        let raw = fs.readFileSync(filePath, 'utf8');
        const tagsMatch = raw.match(/^tags:\s*\[([^\]]*)\]/m);
        if (!tagsMatch) continue;

        const originalTags = tagsMatch[1].split(',').map(t => t.trim().replace(/['"]/g, ''));
        const newTags = originalTags.map(t => t === fromTag ? toTag : t);

        if (newTags.join(',') !== originalTags.join(',')) {
          // Deduplicate
          const deduped = [...new Set(newTags)];
          const tagStr = deduped.map(t => `'${t}'`).join(', ');
          raw = raw.replace(/^tags:\s*\[([^\]]*)\]/m, `tags: [${tagStr}]`);
          fs.writeFileSync(filePath, raw, 'utf8');
          modified++;
        }
      }

      return Response.json({ success: true, modified });
    }

    if (action === 'delete') {
      if (!fromTag) {
        return Response.json({ error: 'fromTag required' }, { status: 400 });
      }

      const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
      let modified = 0;

      for (const file of files) {
        const filePath = path.join(POSTS_DIR, file);
        let raw = fs.readFileSync(filePath, 'utf8');
        const tagsMatch = raw.match(/^tags:\s*\[([^\]]*)\]/m);
        if (!tagsMatch) continue;

        const originalTags = tagsMatch[1].split(',').map(t => t.trim().replace(/['"]/g, ''));
        const newTags = originalTags.filter(t => t !== fromTag);

        if (newTags.length !== originalTags.length) {
          const tagStr = newTags.map(t => `'${t}'`).join(', ');
          raw = raw.replace(/^tags:\s*\[([^\]]*)\]/m, `tags: [${tagStr}]`);
          fs.writeFileSync(filePath, raw, 'utf8');
          modified++;
        }
      }

      return Response.json({ success: true, modified });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

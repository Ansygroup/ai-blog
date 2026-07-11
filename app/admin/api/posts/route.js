import { getAllPosts } from '@/lib/posts';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const posts = getAllPosts({ includeDrafts: true });
    return Response.json({
      posts: posts.map(({ content, ...rest }) => rest),
      total: posts.length,
      published: posts.filter((p) => !p.draft).length,
      drafts: posts.filter((p) => p.draft).length,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

const SCRIPTS = {
  'fix-excerpts': { script: 'fix-excerpts.js', args: ['--ai'] },
  'expand-thin': { script: 'expand-thin-content.js', args: [] },
  'refresh-content': { script: 'content-refresher.js', args: ['--ai'] },
  'seo-optimizer': { script: 'seo-optimizer.js', args: ['--fix'] },
  'humanize': { script: 'humanize-post.js', args: [] },
};

export async function POST(req) {
  try {
    const { action, slugs } = await req.json();
    if (!action || !slugs || !Array.isArray(slugs) || slugs.length === 0) {
      return Response.json({ error: 'action and slugs array required' }, { status: 400 });
    }

    const scriptConfig = SCRIPTS[action];
    if (!scriptConfig) {
      return Response.json({ error: `Unknown action: ${action}. Available: ${Object.keys(SCRIPTS).join(', ')}` }, { status: 400 });
    }

    const postsDir = path.join(process.cwd(), 'content', 'posts');
    const results = [];

    for (const slug of slugs) {
      const filePath = path.join(postsDir, `${slug}.mdx`);
      if (!fs.existsSync(filePath)) {
        results.push({ slug, success: false, error: 'File not found' });
        continue;
      }

      try {
        const scriptPath = path.join(process.cwd(), 'scripts', scriptConfig.script);
        const cmd = `node "${scriptPath}"${scriptConfig.args.length ? ' ' + scriptConfig.args.map(a => `"${a}"`).join(' ') : ''} "${filePath}"`;
        const output = execSync(cmd, {
          cwd: process.cwd(),
          timeout: 60000,
          maxBuffer: 5 * 1024 * 1024,
          encoding: 'utf8',
        });
        results.push({ slug, success: true, output: output.split('\n').filter(l => l.trim()).slice(-3).join('\n') });
      } catch (err) {
        results.push({ slug, success: false, error: err.message.slice(0, 200) });
      }
    }

    const successCount = results.filter(r => r.success).length;
    return Response.json({ results, successCount, failCount: results.length - successCount });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const REPO = path.resolve(__dirname, '..', '..');
const DOCTOR = path.join(REPO, 'scripts', 'ai-blog-doctor.mjs');

const mdx = (cover) =>
  `---\ntitle: "Test Post (2026)"\ncover: "${cover}"\ndate: 2026-01-01\nexcerpt: "x"\n---\n\nbody\n`;

// Black-box harness: build a throwaway repo with the shape the doctor expects,
// run it there with --apply --only covers, then read the .mdx back.
function runDoctor(postName, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'doctorfix-'));
  const all = { ...files, 'lib/config.js': 'module.exports = {};\n' };
  try {
    for (const [rel, body] of Object.entries(all)) {
      const full = path.join(root, rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, body);
    }
    execFileSync(process.execPath, [DOCTOR, '--apply', '--only', 'covers'], {
      cwd: root,
      encoding: 'utf8',
    });
    return fs.readFileSync(path.join(root, 'content', 'posts', postName), 'utf8');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

describe('doctor fixCovers must not repoint a valid cover', () => {
  it('KEEPS a cover whose file actually exists under public/images', () => {
    const out = runDoctor('my-post.mdx', {
      'content/posts/my-post.mdx': mdx('/images/my-post.jpg'),
      'public/images/my-post.jpg': 'x',
      // Decoy sharing one more slug word — the keyword scorer would prefer it.
      'public/images/my-post-a-comparison.jpg': 'x',
    });
    expect(out).toContain('cover: "/images/my-post.jpg"');
    expect(out).not.toContain('comparison.jpg');
  });

  it('REPAIRS a cover whose file is genuinely absent', () => {
    const out = runDoctor('gone-post.mdx', {
      'content/posts/gone-post.mdx': mdx('/images/gone-post.jpg'),
      'public/images/gone-post-related.jpg': 'x',
    });
    expect(out).toContain('cover: "/images/gone-post-related.jpg"');
  });
});

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

  it('LEAVES an absent cover alone rather than pointing it at an unrelated image', () => {
    // "gone-post-related.jpg" is a DIFFERENT subject. Repointing the cover there
    // publishes a false image, so the doctor must leave the post for the
    // SD-Turbo covergen queue (which renders the post's own cover) to fill in.
    const out = runDoctor('gone-post.mdx', {
      'content/posts/gone-post.mdx': mdx('/images/gone-post.jpg'),
      'public/images/gone-post-related.jpg': 'x',
    });
    expect(out).toContain('cover: "/images/gone-post.jpg"');
    expect(out).not.toContain('gone-post-related.jpg');
  });

  it('KEPS a block-scalar cover whose file exists (regression: read ">-" as the path)', () => {
    // The old parser read the literal ">-" as the path, judged every
    // block-scalar cover missing, and rewrote it -- orphaning the image line
    // and producing "bad indentation of a mapping entry".
    const block = (cover) =>
      `---\ntitle: "Test Post (2026)"\ncover: >-\n  "${cover}"\ndate: 2026-01-01\nexcerpt: "x"\n---\n\nbody\n`;
    const out = runDoctor('blocky.mdx', {
      'content/posts/blocky.mdx': block('/images/blocky.jpg'),
      'public/images/blocky.jpg': 'x',
    });
    // Untouched: the block scalar and its quoted value both survive verbatim.
    expect(out).toContain('cover: >-');
    expect(out).toContain('"/images/blocky.jpg"');
    expect(out).not.toContain('comparison');
  });

  it('produces valid YAML when it does rewrite a cover', () => {
    const out = runDoctor('exact-match.mdx', {
      'content/posts/exact-match.mdx': mdx('/images/exact-match-missing.jpg'),
      'public/images/exact-match.png': 'x',
    });
    // cover rewritten to the exact-slug image, and no orphaned continuation line
    expect(out).toContain('cover: "/images/exact-match.png"');
    expect(out.match(/^cover:/gm)?.length).toBe(1);
  });
});

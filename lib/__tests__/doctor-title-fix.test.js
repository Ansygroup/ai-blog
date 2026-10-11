import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const REPO = path.resolve(__dirname, '..', '..');
const DOCTOR = path.join(REPO, 'scripts', 'ai-blog-doctor.mjs');

// Black-box harness (mirrors doctor-cover-fix.test.js): build a throwaway repo
// with the shape the doctor expects, run it there with --apply --only <keys>,
// then read the .mdx back.
function runDoctor(postName, files, only = 'content,long') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'doctortitle-'));
  const all = { ...files, 'lib/config.js': 'module.exports = {};\n' };
  try {
    for (const [rel, body] of Object.entries(all)) {
      const full = path.join(root, rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, body);
    }
    execFileSync(process.execPath, [DOCTOR, '--apply', '--only', only], {
      cwd: root,
      encoding: 'utf8',
    });
    return fs.readFileSync(path.join(root, 'content', 'posts', postName), 'utf8');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const post = (title) =>
  `---\ntitle: "${title}"\nslug: "my-post"\ndate: 2026-01-01\nexcerpt: "x"\n---\n\nbody\n`;

const titleOf = (raw) => raw.match(/^title:.*$/m)[0];

describe('doctor title writers must rewrite the WHOLE title line', () => {
  // Regression: both fixers captured with /^title:\s*"(.+)"\s*$/m but wrote back
  // with /^title: ".*?"/m. That writer is NON-GREEDY and stops at the first
  // literal '"', so a title containing an escaped quote (\") had the new title
  // injected mid-line with the original tail re-appended — e.g.
  //   'Fixing \ (2026 Guide)"undefined": Best AI Tools to Debug Code in 2026'
  // became
  //   'Fixing \ (2026 Guide)"undefined""undefined": Best AI Tools to"undefined""...'
  // Every apply run made the title WORSE and was never idempotent.
  const ESCAPED = 'Fixing \\ (2026 Guide)\\"undefined\\": Best AI Tools to Debug Code in 2026';

  it('does not corrupt a title containing an escaped quote (regression)', () => {
    const out = runDoctor('my-post.mdx', { 'content/posts/my-post.mdx': post(ESCAPED) });
    const line = titleOf(out);
    // The buggy non-greedy writer injected the new title mid-line and re-appended
    // the original tail, producing a doubled fragment:
    //   ... to"undefined""undefined": Best AI Tools to"undefined""undefined": ...
    // i.e. the head appears more than once and the tail is duplicated.
    const heads = out.split('\n')[1].match(/Fixing/g) || [];
    expect(heads.length).toBeLessThanOrEqual(1);
    expect(out).not.toContain('Best AI Tools to"undefined');
    // Exactly one title line, and it parses as a single YAML scalar.
    expect(out.match(/^title:/gm)?.length).toBe(1);
    // The line must be balanced: quoted scalar closes before end of line.
    expect(line).toMatch(/^title: ".*"$/);
  });

  it('is idempotent: a second apply run changes nothing', () => {
    const first = runDoctor('my-post.mdx', { 'content/posts/my-post.mdx': post(ESCAPED) });
    const second = runDoctor('my-post.mdx', { 'content/posts/my-post.mdx': first });
    expect(titleOf(second)).toBe(titleOf(first));
  });

  it('trims a long plain title without duplicating its tail', () => {
    const long = 'AI-Driven Dynamic Pricing Engines for E-commerce: 2026 Comparison';
    const out = runDoctor('my-post.mdx', { 'content/posts/my-post.mdx': post(long) });
    const line = titleOf(out);
    expect(line.startsWith('title: "')).toBe(true);
    expect(line.endsWith('"')).toBe(true);
    expect(out).toContain('slug: "my-post"');
    expect(out.match(/^title:/gm)?.length).toBe(1);
  });

  it('still leaves an already-valid frontmatter untouched', () => {
    const valid = 'Copy.ai vs Jasper 2026: 15-Task Test, Pricing';
    const out = runDoctor('my-post.mdx', { 'content/posts/my-post.mdx': post(valid) });
    expect(out).toContain(`title: "${valid}"`);
  });
});
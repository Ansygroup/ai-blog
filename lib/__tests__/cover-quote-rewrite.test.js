import { describe, it, expect } from 'vitest';

/**
 * Regression guard for the frontmatter corruption that broke the
 * "SEO audit + content checks" CI job (deploy.yml).
 *
 * Commit 12acc1df1 ("chore: eliminate all duplicate covers") rewrote cover
 * lines with a regex that stopped before the closing quote
 * (`[^'"\r\n]+`), so the old quote survived and the replacement appended
 * another one. Each pass grew the line until the frontmatter was no longer
 * valid YAML ("unexpected end of the stream within a double quoted scalar"),
 * which `node scripts/seo-audit.js` treats as a hard failure and which
 * blocks the production deploy via `needs: audit`.
 *
 * The invariant: a cover rewrite must consume the ENTIRE old line and leave
 * exactly one quoted value.
 */
const COVER_LINE = /^[ \t]*cover:[ \t]*['"]?[^'"\r\n]*['"]*[ \t]*\r?$/m;
const rewriteCover = (txt, newName) =>
  txt.replace(COVER_LINE, `cover: "/images/${newName}"`);

const FM = [
  '---',
  'title: Some Post',
  'slug: some-post',
  'excerpt: >-',
  '  A folded excerpt that spans',
  '  more than one line.',
  'date: \'2026-07-16\'',
  'cover: "/images/old.jpg"',
  'draft: false',
  '---',
  '',
  '## Section',
  '',
  'Body text.',
].join('\n');

describe('cover-line rewrite must not accumulate quotes', () => {
  it('normalises a clean line to exactly one quoted value', () => {
    const out = rewriteCover(FM, 'new.jpg');
    expect(out).toContain('cover: "/images/new.jpg"');
    expect(out).not.toMatch(/cover:.*""/);
  });

  it('consumes the closing quote so no stray quote survives', () => {
    const out = rewriteCover(FM, 'new.jpg');
    expect(out).toContain('cover: "/images/new.jpg"');
    expect(out.match(/"/g).length).toBe(2); // only the new pair
    expect(out).not.toMatch(/cover:.*""/);
  });

  it('is idempotent across repeated passes', () => {
    let out = FM;
    for (let i = 0; i < 5; i++) out = rewriteCover(out, 'new.jpg');
    expect(out.split('\n').filter((l) => l.startsWith('cover: '))).toEqual([
      'cover: "/images/new.jpg"',
    ]);
    expect(out).not.toMatch(/cover:.*""/);
  });

  it('repairs a line already carrying stray quotes', () => {
    const broken = FM.replace(
      'cover: "/images/old.jpg"',
      'cover: "/images/old.jpg""""',
    );
    const out = rewriteCover(broken, 'new.jpg');
    expect(out).toContain('cover: "/images/new.jpg"');
    expect(out).not.toMatch(/cover:.*""/);
  });

  it('leaves the rest of the frontmatter byte-identical', () => {
    const out = rewriteCover(FM, 'new.jpg');
    expect(out.replace(/^cover:.*$/m, '')).toBe(FM.replace(/^cover:.*$/m, ''));
    expect(out).toContain('excerpt: >-\n  A folded excerpt that spans');
  });

  it('does not touch a cover-looking line inside the body', () => {
    const withBody = FM + '\nThe `cover: "/x.jpg"` key lives only in frontmatter.\n';
    const out = rewriteCover(withBody, 'new.jpg');
    expect(out.match(/cover: "/g).length).toBe(2); // frontmatter + body mention
  });
});
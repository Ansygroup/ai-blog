import { describe, it, expect } from 'vitest';
import { validateFrontmatter, VALID_CATEGORIES } from '../validate.js';

describe('validateFrontmatter', () => {
  it('passes valid fields', () => {
    const result = validateFrontmatter({
      title: 'My Post',
      date: '2025-01-01',
      category: 'AI Tools',
      draft: 'false',
      seoScore: '75',
      excerpt: 'A short excerpt',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('passes with empty fields (not required)', () => {
    const result = validateFrontmatter({ title: 'Test' });
    expect(result.valid).toBe(true);
  });

  it('title too long', () => {
    const result = validateFrontmatter({ title: 'x'.repeat(121) });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('title');
    expect(result.errors[0]).toContain('120');
  });

  it('title at max length passes', () => {
    const result = validateFrontmatter({ title: 'x'.repeat(120) });
    expect(result.valid).toBe(true);
  });

  it('invalid date format', () => {
    const result = validateFrontmatter({ title: 'x', date: '01-01-2025' });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('date');
  });

  it('valid date format passes', () => {
    const result = validateFrontmatter({ title: 'x', date: '2025-01-01' });
    expect(result.valid).toBe(true);
  });

  it('disallowed category', () => {
    const result = validateFrontmatter({ title: 'x', category: 'Fake Category' });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('category');
  });

  it('allowed category passes', () => {
    const result = validateFrontmatter({ title: 'x', category: 'AI News' });
    expect(result.valid).toBe(true);
  });

  it('all valid categories pass', () => {
    for (const cat of VALID_CATEGORIES) {
      const result = validateFrontmatter({ title: 'x', category: cat });
      expect(result.valid).toBe(true);
    }
  });

  it('seoScore non-numeric', () => {
    const result = validateFrontmatter({ title: 'x', seoScore: 'abc' });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('seoScore');
  });

  it('seoScore below min', () => {
    const result = validateFrontmatter({ title: 'x', seoScore: '-1' });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('>= 0');
  });

  it('seoScore above max', () => {
    const result = validateFrontmatter({ title: 'x', seoScore: '101' });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('<= 100');
  });

  it('seoScore at boundaries passes', () => {
    expect(validateFrontmatter({ title: 'x', seoScore: '0' }).valid).toBe(true);
    expect(validateFrontmatter({ title: 'x', seoScore: '100' }).valid).toBe(true);
  });

  it('draft accepts true', () => {
    const result = validateFrontmatter({ title: 'x', draft: 'true' });
    expect(result.valid).toBe(true);
  });

  it('draft accepts false', () => {
    const result = validateFrontmatter({ title: 'x', draft: 'false' });
    expect(result.valid).toBe(true);
  });

  it('draft rejects invalid boolean', () => {
    const result = validateFrontmatter({ title: 'x', draft: 'yes' });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('draft');
  });

  it('excerpt within maxLength', () => {
    const result = validateFrontmatter({ title: 'x', excerpt: 'x'.repeat(250) });
    expect(result.valid).toBe(true);
  });

  it('excerpt too long', () => {
    const result = validateFrontmatter({ title: 'x', excerpt: 'x'.repeat(251) });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('excerpt');
  });

  it('lastUpdated valid format passes', () => {
    const result = validateFrontmatter({ title: 'x', lastUpdated: '2025-06-01' });
    expect(result.valid).toBe(true);
  });

  it('lastUpdated invalid format fails', () => {
    const result = validateFrontmatter({ title: 'x', lastUpdated: 'June 1, 2025' });
    expect(result.valid).toBe(false);
  });

  it('skips unknown fields', () => {
    const result = validateFrontmatter({ title: 'x', unknownField: 'whatever' });
    expect(result.valid).toBe(true);
  });
});

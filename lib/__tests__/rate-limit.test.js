import { describe, it, expect } from 'vitest';
import { rateLimit } from '../rate-limit.js';

// Each test uses a unique IP prefix to avoid cross-test interference
// since rate-limit.js maintains a module-level Map.

describe('rateLimit', () => {
  it('allows first request', () => {
    const result = rateLimit('10.0.0.1', 5, 60000);
    expect(result.allowed).toBe(true);
    expect(result.retryAfter).toBeUndefined();
  });

  it('allows requests under limit', () => {
    for (let i = 0; i < 4; i++) {
      const result = rateLimit('10.0.0.2', 5, 60000);
      expect(result.allowed).toBe(true);
    }
  });

  it('blocks request over limit', () => {
    for (let i = 0; i < 10; i++) rateLimit('10.0.0.3', 10, 60000);
    const blocked = rateLimit('10.0.0.3', 10, 60000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it('different IPs have independent limits', () => {
    for (let i = 0; i < 5; i++) rateLimit('10.0.0.4', 5, 60000);
    expect(rateLimit('10.0.0.4', 5, 60000).allowed).toBe(false);
    expect(rateLimit('10.0.0.5', 5, 60000).allowed).toBe(true);
  });

  it('returns allowed:true for no IP', () => {
    const result = rateLimit(null, 10, 60000);
    expect(result.allowed).toBe(true);
  });

  it('returns allowed:true for undefined IP', () => {
    const result = rateLimit(undefined, 10, 60000);
    expect(result.allowed).toBe(true);
  });

  it('respects default limits (10/min)', () => {
    for (let i = 0; i < 10; i++) rateLimit('10.0.0.6');
    const blocked = rateLimit('10.0.0.6');
    expect(blocked.allowed).toBe(false);
  });
});

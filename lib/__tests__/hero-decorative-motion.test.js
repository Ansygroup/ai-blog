// Contract test: the home hero must not run perpetual decorative animations.
// Skeleton loaders and explicit loading states are allowed (real purpose).
// What we ban: animate-pulse / animate-bounce / animate-spin on a static
// decorative element that will be in the viewport for the lifetime of the page.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const HOME_PATH = join(process.cwd(), 'app', 'page.js');
const src = readFileSync(HOME_PATH, 'utf-8');

function heroSlice(source) {
  const start = source.indexOf('{/* HERO */}');
  if (start === -1) throw new Error('HERO comment marker not found in app/page.js');
  // End at the next closing </section> after the hero comment.
  const end = source.indexOf('</section>', start);
  if (end === -1) throw new Error('HERO section not closed');
  return source.slice(start, end);
}

describe('Home hero — anti-slop contract', () => {
  const hero = heroSlice(src);

  it('does not run perpetual animate-pulse on decorative gradient', () => {
    // animate-pulse is fine in skeleton loaders (real loading state).
    // It is NOT fine on a hero decoration that lives forever in the viewport.
    expect(hero).not.toMatch(/animate-pulse/);
  });

  it('does not choreograph entrance animations (animate-fade-in / animate-slide-up)', () => {
    // Choreographed entrance animations are agency-template slop.
    // One single subtle motion is fine; a stacked .delay-100/200/300 cascade is not.
    expect(hero).not.toMatch(/animate-fade-in/);
    expect(hero).not.toMatch(/animate-slide-up/);
    expect(hero).not.toMatch(/animate-bounce/);
    expect(hero).not.toMatch(/animate-delay-/);
  });

  it('derives the year badge from the build clock, not a frozen string', () => {
    // "Updated for 2026" froze on Jan 1 2027. The badge must read from
    // new Date().getFullYear() so the page can never rot.
    expect(hero).not.toMatch(/Updated for 20\d{2}/);
    expect(hero).toMatch(/Updated for\s*\{new Date\(\)\.getFullYear\(\)\}/);
  });
});

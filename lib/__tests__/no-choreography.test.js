// Contract test: no choreographed decorative motion on the root layout
// or on admin upgrade results. Skeleton loaders and explicit loading
// states are allowed (real purpose). What we ban: animate-fade-in /
// animate-slide-up / animate-bounce on a non-skeleton element.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(process.cwd(), 'app', 'layout.js');
const ADMIN_UPGRADE = join(process.cwd(), 'app', 'admin', 'upgrade', 'page.js');
const root = readFileSync(ROOT, 'utf-8');
const adminUpgrade = readFileSync(ADMIN_UPGRADE, 'utf-8');

describe('Root layout + admin upgrade — no decorative entrance', () => {
  it('root <main> does not run a choreographed entrance on every navigation', () => {
    // The root <main> wraps every page (admin and public). animate-fade-in
    // here runs on every client-side route change — the #1 source of
    // "the site feels slow" complaints.
    const mainTag = root.match(/<main[^>]*>/);
    expect(mainTag, 'no <main> tag found in app/layout.js').toBeTruthy();
    const tag = mainTag ? mainTag[0] : '';
    expect(tag).not.toMatch(/animate-fade-in/);
    expect(tag).not.toMatch(/animate-slide-up/);
    expect(tag).not.toMatch(/animate-bounce/);
    expect(tag).not.toMatch(/animate-pulse/);
  });

  it('admin upgrade analysis results do not choreograph entrance', () => {
    // Match the className form, not the literal word in any explanatory comment.
    expect(adminUpgrade).not.toMatch(/className=[^>]*\banimate-fade-in\b/);
    expect(adminUpgrade).not.toMatch(/className=[^>]*\banimate-slide-up\b/);
  });

  it('mission-control in_progress dot still has animate-pulse (real status indicator)', () => {
    // We deliberately keep animate-pulse on the LIVE status dot — it conveys
    // "this run is in progress right now" which is real information, not
    // decoration. Pinning this so future audits don't strip it.
    const mc = readFileSync(join(process.cwd(), 'app', 'admin', 'mission-control', 'page.js'), 'utf-8');
    expect(mc).toMatch(/in_progress:[^}]*animate-pulse/);
  });
});

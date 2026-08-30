#!/usr/bin/env node
/**
 * ai-blog-autodoctor.cron — self-completing daily health workflow.
 *
 * Runs the doctor in --check. If defects remain, it applies them, commits, and
 * pushes to main (Vercel's deploy.yml redeploys on push — no local token needed).
 * Idempotent and guarded: never pushes if working tree is already clean, and
 * always re-verifies with a build + vitest before committing.
 *
 * Intended to be fired by a cron job. Output is the doctor report (for delivery).
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const ROOT = process.cwd();
const run = (cmd) => execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

function main() {
  // 1) check
  let check;
  try { check = JSON.parse(run('node scripts/ai-blog-doctor.mjs')); }
  catch (e) { return { ok: false, stage: 'check', error: String(e) }; }

  if (check.corruptRemaining === 0 && check.fixed.links === 0 && check.fixed.claims === 0 && check.fixed.crlf === 0) {
    return { ok: true, stage: 'check', message: 'no defects — nothing to do', report: check };
  }

  // 2) apply
  const apply = JSON.parse(run('node scripts/ai-blog-doctor.mjs --apply'));

  // 3) verify build + tests before committing (guard against shipping breakage)
  try { run('npm test'); } catch (e) { return { ok: false, stage: 'test', error: 'vitest failed — aborting push', report: apply }; }
  try { run('npm run build'); } catch (e) { return { ok: false, stage: 'build', error: 'build failed — aborting push', report: apply }; }

  // 4) commit + push (deploy happens via CI)
  try {
    run('git add -A');
    run('git -c user.email="ansy0@autopilot.local" -c user.name="Ansy Autopilot" commit -q -m "chore: ai-blog-doctor auto-fix (' +
      `corrupt:${apply.fixed.corrupt} links:${apply.fixed.links} claims:${apply.fixed.claims} crlf:${apply.fixed.crlf})`);
    run('git push origin main');
  } catch (e) {
    return { ok: false, stage: 'push', error: String(e), report: apply };
  }

  return { ok: true, stage: 'applied', message: 'defects fixed, committed, pushed (CI will redeploy)', report: apply };
}

const out = main();
console.log(JSON.stringify(out, null, 2));
process.exit(out.ok ? 0 : 1);

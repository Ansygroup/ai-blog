# Auto-Pilot agent: path bug + proof-gate false lead (2026-10-05)

Two findings from the 2026-10-05 CI triage of `Ansygroup/ai-blog`. The second one is
a *negative* result — it stops a future session from chasing a convincing red herring.

## 1. FIXED: `path.join(__dirname, '..', <repo-relative script>)` in a subdir agent

`scripts/agents/auto-pilot.js` built its script path as:

```js
const scriptPath = path.join(__dirname, '..', script);
```

with `__dirname` = `<repo>/scripts/agents` and `script` **repo-relative**
(`scripts/seo-optimizer.js`), which resolves to
`<repo>/scripts/agents/../scripts/<name>.js` → **`<repo>/scripts/scripts/<name>.js`**
— one level too deep. `fs.existsSync()` was therefore `false` for **every** entry in
`scriptMap`, so the agent could never launch any action and every run printed:

```
❌ ai-blog-doctor failed: Script not found: ai-blog-doctor.js
```

Two defects were stacked in the same function/table:

1. the `join` above, and
2. two `scriptMap` entries pointing at files that **do not exist in this repo**:
   `scripts/generate-faq.js` and `scripts/fix-excerpts.js`. The real workers are
   `scripts/add-faq-to-qa-pages.js` and `scripts/seo-optimizer.js --fix`.

### Signature to recognise
`Script not found: <name>` printed by an agent whose script plainly exists in
`scripts/`. Check the join, not the file.

### Why CI never caught it
`auto-pilot.yml` is **`workflow_dispatch` only** — no `push`, no `schedule`. It had
exactly **one** run in its entire history (`33328814158`, 2026-08-30) and it failed.
So a fully green 24-workflow fleet says nothing about these helpers. Always check
`workflow_dispatch`-only workflows separately.

### The fix
Resolve against an explicit repo ROOT, accept both input forms, and print the
resolved path in the error so the next failure is self-diagnosing:

```js
const ROOT = path.join(__dirname, '..', '..');
const scriptPath = path.isAbsolute(script)
  ? script
  : path.resolve(ROOT, path.basename(path.dirname(script)) === 'scripts'
      ? script
      : path.join('scripts', script));
if (!fs.existsSync(scriptPath)) {
  return { success: false, error: `Script not found: ${script} (resolved to ${scriptPath})` };
}
```

### Verify WITHOUT CI
```bash
node scripts/verify-autopilot-scriptpath.js     # PASS: all mapped actions resolve
GROQ_API_KEY=dummy node scripts/agents/auto-pilot.js --dry-run
# expect: "🎯 Decision: … [DRY RUN] Would run: scripts/<real>.js --ai --fix"
# NOT:   "Script not found"
```
End-to-end launch proof (both dispatch forms), with a throwaway
`scripts/_aiber-noop.js` that prints its argv: each must print `✅ Done`.

Shipped in commit `90f62ed2b`; deploy run `37237162891` went green and the prod
alias promoted to that sha.

## 2. FALSE LEAD: a `git check-ignore` hit on the proof path is NOT a broken gate

`public/social/posted-<date>.txt` **is** git-ignored — `.gitignore` has
`public/social/*` and un-ignores only `*.json`:

```
.gitignore:24:public/social/*   public/social/posted-2026-10-05.txt
```

That looks exactly like the root cause of the permanently-zero proof gate
(`[mark-processed] social: 0/5 marked — 5 left PENDING`), because the workflow's
`git add public/social/` cannot stage the proof file, so it never reaches `main`.

**It is not the cause.** `mark-processed.js` reads the filesystem *inside the same
CI run that just wrote the proof*, so in-run marking works fine. Verified by
synthesising a proof line:

```bash
printf '<slug>: twitter=true linkedin=true facebook=false\n' > public/social/posted-2026-10-05.txt
node scripts/mark-processed.js social content/posts/<slug>.mdx
# -> [mark-processed] social: 1/1 marked      (gate PASSES)
```

My first draft of that test asserted the opposite and printed a FAIL verdict while
its own case-B output said `1/1 marked` — a reminder to check that a test's verdict
agrees with its measurements before reporting it.

**RULE:** a proof artifact only has to reach the SAME run that reads it, not
`main`. Never diagnose the idempotent manifest from `git check-ignore` alone —
run `mark-processed.js` with a synthetic proof line and read the real verdict.
Keep the general rule from the main skill too: a proof file must be written ONLY
on the success path (that was the separate, real Pinterest bug).
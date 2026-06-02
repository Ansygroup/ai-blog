# GitHub Actions Workflows

Two workflows ship with this project.

## 1. `deploy.yml` — Build + Deploy + Auto-publish

**Triggers:** push to `main`, manual dispatch

**Jobs:**
1. **`audit`** — runs `seo-audit.js` + `npm run build`. Fast fail on bad content/breaks.
2. **`build-deploy`** — only runs if audit passes. Deploys to Vercel, generates one new post (if queue has items), pings IndexNow.

**Required GitHub Secrets** (Settings → Secrets and variables → Actions):
| Secret | Required? | Notes |
|---|---|---|
| `VERCEL_TOKEN` | Yes (for deploy) | From https://vercel.com/account/tokens |
| `NEXT_PUBLIC_SITE_URL` | Yes | e.g. `https://aipulse.com` |
| `NEXT_PUBLIC_SITE_NAME` | Yes | e.g. `AI Pulse Daily` |
| `GROQ_API_KEY` | Yes (for auto-publish) | Free at https://console.groq.com/ |
| `INDEXNOW_KEY` | Recommended | UUID for IndexNow API |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | Optional | `ca-pub-xxx` |
| `NEXT_PUBLIC_ADSENSE_SLOT_*` | Optional | Ad unit IDs |
| `NEXT_PUBLIC_GA_ID` | Optional | GA4 measurement ID |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Optional | Plausible domain |

**Auto-publish behavior:**
- Generates 1 new post per push (if keyword queue is non-empty)
- Pushes to a new branch `auto/content-<timestamp>` and opens a PR
- PR can be auto-merged via branch protection rules, or reviewed manually
- **No infinite loop:** the auto-publisher never pushes back to `main` directly

## 2. `scheduled-content.yml` — Scheduled content

**Triggers:** every 8 hours (cron `0 */8 * * *`), manual dispatch

**Jobs:**
1. **`generate`** — generates 1 post from the queue, polishes it, runs SEO audit, opens a PR

**Why a separate workflow:** separation of concerns. The deploy workflow handles "code is pushed, deploy it." The scheduled workflow handles "8 hours passed, time to make content." This makes the cron more reliable (cron workflows on GitHub can be delayed or skipped under load, and you don't want that delay to block deploys).

**Same secrets required as the deploy workflow.**

## Disabling auto-publishing

If you want to publish manually instead of letting the bot do it:

1. Delete `.github/workflows/scheduled-content.yml`
2. Edit `.github/workflows/deploy.yml` and remove the "Auto-generate next post" step

## Local testing before push

Run the smoke test before every commit:

```bash
npm run smoke:start
```

This catches 95% of issues locally before they hit CI.

## Required GitHub repo settings

For the auto-merge to work without your intervention:
1. Settings → Branches → Add rule for `main`
2. Enable "Allow auto-merge"
3. Enable "Automatically delete head branches" (keeps the repo clean)

For PR auto-merge from the bot:
1. Settings → Branches → Add rule for `main`
2. Enable "Require approvals" → set to 0
3. Enable "Allow specified actors to bypass required pull requests" → add the bot

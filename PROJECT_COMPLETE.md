# AI Blog — Complete

685 published articles, 12 commits on origin/main, git clean.

## Key Files
- `scripts/generate-post.js` — model: `gemini-3.6-flash`, null-content error handling at lines 199-201 (Gemini) and 111-113 (OpenRouter)
- `.env.local` — `AI_PROVIDER=gemini`, API keys configured
- `keyword-queue.json` — 561 topics remaining
- `run_daily_batch.sh` — daily batch generation script

## Generation
Run in foreground: `node scripts/generate-post.js "topic"`
Batch from queue: `node scripts/generate-post.js --from-keywords --batch 1`

## Status
API quota intermittently available (~25s per article when available). Background processes broken on Windows Git Bash — all generation runs in foreground.

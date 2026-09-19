# AI Blog Batch Generation — Status & Instructions

## Current State (as of Sept 19, 2026)

### ✅ Committed & Working
- **685 `.mdx` posts** in `content/posts/`, all `draft: false`
- **`scripts/generate-post.js`** — model = `gemini-3.6-flash` (line ~179)
- **Null-content error handling** added to both providers:
  - Gemini provider (line ~199): throws on empty content
  - OpenRouter provider (line ~111): throws on empty content
- **CLI parsing fixed**: `--batch` value no longer mistaken for `topicArg`
- **`.env.local`**: `AI_PROVIDER=gemini`, `GEMINI_API_KEY` confirmed working
- **4 git commits** on main

### 🔴 API Quota Exhausted
- Gemini: HTTP 429 (quota exceeded — 15 req/min limit hit)
- OpenRouter: HTTP 402 (insufficient free-tier credits)
- Both free tiers exhausted for today

### 📋 How to Generate Articles When Quota Resets

**Foreground batch mode (no background processes needed):**
```bash
cd C:/Users/ansy0/ai-blog
node scripts/generate-post.js --from-keywords --batch 1
```
- `--from-keywords` pulls from `keyword-queue.json` (561 topics)
- `--batch 1` generates 1 article at a time
- Each article gets ~5s gap automatically (rate limit)
- Runs in FOREGROUND — no stdin issues
- Works on Windows Git Bash

**Direct topic mode (also works):**
```bash
node scripts/generate-post.js "Your Topic Here"
```

### 📊 Provider Configuration
| Provider | Model | Free Tier Limit | Status |
|----------|-------|-----------------|--------|
| Gemini | `gemini-3.6-flash` | 15 req/min, 1500/day | 429 (exhausted) |
| OpenRouter | `google/gemini-3.6-flash` | Limited free credits | 402 (insufficient) |

### 🛠️ Code Fixes Applied
1. **Model**: Changed from `gemini-flash-latest` → `gemini-3.6-flash`
2. **Null content handling**: Both providers now throw `Error` on empty content instead of writing empty articles
3. **CLI parsing**: Added `skipArgs` set to filter `--batch`, `--from-keywords`, `--dry` from `topicArg` search
4. **Fallback provider**: OpenRouter added as fallback in `getProvider()`

### 📝 Keyword Queue
- `keyword-queue.json` has 561 topics remaining
- Each entry: `{topic, keywords: [...], category}`
- Processed topics are consumed sequentially

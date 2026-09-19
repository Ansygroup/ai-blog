#!/bin/bash
# Daily batch generation for ai-blog
# Run: node run_daily_batch.js [count]
# Usage: Set as cron job for daily execution when API quota resets

cd "$(dirname "$0")"
node scripts/generate-post.js --from-keywords --batch 1

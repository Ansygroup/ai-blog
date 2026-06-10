<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan

## Admin Dashboard
- Located at `/admin/*` (Next.js app router)
- Protected by NextAuth with GitHub OAuth
- Unauthenticated users redirected to `/admin/login`
- API routes at `/admin/api/*` (not protected by middleware)
- Actions (Generate, Polish, SEO, Links, Refresh, Humanize) dispatch GitHub Actions workflows via `GITHUB_API_TOKEN`

## Key Scripts
- `scripts/humanize-post.js` — Uses Groq API + humanizer patterns to remove AI writing tells
- `scripts/generate-post.js` — AI post generation engine
- `scripts/polish-posts.js` — Formatting/content cleanup
- `scripts/seo-optimizer.js` — SEO optimization

## Installed Skills
- `humanizer` at `~/.claude/skills/humanizer/` — Removes signs of AI-generated writing (33 patterns)
<!-- SPECKIT END -->

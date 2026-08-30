<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan

## Admin Dashboard
- Located at `/admin/*` (Next.js app router), 39 pages: MC, Analytics, Stats, Performance, Posts, Content Pipeline, Queue, SEO, Search, SEO Meta, SEO Preview, Reports, Content Gaps, Content Brief, Social Scheduler, Links (Link Checker), Calendar, Schedule, Deploy, Actions, Series, Bulk Edit, Writer, AI Chat, Backup, Upgrade, Tags, Categories, Newsletter, Content Refresh, Workflows, Activity Log, Affiliates, Affiliate Links, Audit, Social, Site Health
- **Content Pipeline** added: Kanban-style 4-column board (Ideas → Drafts → Scheduled → Published); add/delete ideas persisted to `public/data/ideas.json`
- **Links page** rebuilt as comprehensive Link Checker: scans all 195 posts for internal/external links, shows stats, filters by domain/type, expandable per-post views
- **Calendar page** enhanced with social schedule overlay: shows pending social posts on calendar days, social toggle, combined post+social sidebar view
- **Visitor Analytics** added: self-hosted pageview tracking with no external service. `/api/track` pings on each public page load, data stored in `public/data/visits.json` with 30-min session dedup
- **Mission Control** enhanced with 8 summary widgets linking to admin pages (Total Posts, Queue, Weak SEO, Excerpt Issues, Stale Posts, Missing Internal Links, Pending Social, Newsletter)
- **Social Scheduler** enhanced with Bulk Auto-Generate: creates pending social posts for all 195 posts in one click
- **Analytics** enhanced with Recharts: publishing activity line chart, SEO score donut chart, category distribution bar chart
- **Affiliates** page added: browse all Amazon products by category, search, view pricing/ratings, link to Amazon
- **Content Audit** page added: unified table of all posts with word count, SEO score, links count, reading time, staleness; sortable and filterable
- **Site Health** page added: diagnostic checker for frontmatter issues, broken links, missing images, duplicate slugs
- **Categories** page added: rename categories across all posts, search, expand per-post view
- **SEO Preview** page added: Google search result preview for any post with stats and suggestions
- **Backup** page added: export all posts as JSON, save server-side backups, browse backup history
- **Schedule** page added: set future publish dates for drafts, unschedule, one-click publish
- **Performance** page added: content scores by category, quick wins, weakest posts, latest full report viewer
- **Activity Log** page added: timeline of all admin actions (schedule, publish, backup, ideas) stored in `public/data/activity-log.json`
- **Queue** page rebuilt: auto-schedule drafts with configurable interval and start date, preview timeline, batch API
- **Bulk Edit** page added: multi-select frontmatter editing (category, draft status, SEO score) with PATCH API
- **Admin Search** component added: Cmd+K command palette across all 37 admin pages and 195 posts; recent searches saved to localStorage
- **Affiliate Links** page added: track which Amazon products are linked from which posts, identify unlinked products and zero-link posts
- **Stats** page added: comprehensive blog metrics in one place — heatmap, monthly trends, category distribution, streaks
- Protected by NextAuth with GitHub OAuth; custom middleware uses `getToken()` redirects to `/admin/login`
- API routes at `/admin/api/*` (not protected by middleware)
- Actions dispatch GitHub Actions workflows via `GITHUB_API_TOKEN`
- Landing page: Mission Control (agent cards grouped into 7 categories, live status dots, Run buttons)

## Key Scripts
- `scripts/ai-blog-doctor.mjs` — Reusable, idempotent health-fixer. Recurring defect classes: corrupt frontmatter (stacked `cover:`, `>- (2026)` title artifact), mangled stacked markdown links `](/posts/x](/posts/y)`, fake "our team spent N hours testing" SEO-spam sentences, CRLF→LF. Run `--apply` to mutate, `--only links,claims` to scope. Report -> `data/doctor-report.json`. Never commits.
- `scripts/humanize-post.js` — Groq + humanizer to remove AI writing tells
- `scripts/generate-post.js` — AI post generation engine
- `scripts/polish-posts.js` — Formatting/content cleanup
- `scripts/seo-optimizer.js` — SEO audit + --fix (excerpts, titles, missing-year)
- `scripts/content-performance-agent.js` — Analyzes all posts, saves report, --fix auto-applies improvements
- `scripts/fix-excerpts.js` — Trims excerpts to 120-160 chars
- `scripts/fix-broken-links.js` — Removes duplicated/stacked internal links
- `scripts/auto-internal-link.js` — Added 791 internal links across 194 posts
- `scripts/normalize-tags.js` — Normalized 624→55 controlled tags (YAML-line-safe)
- `scripts/fix-aria-hidden.js` (temp, deleted) — Added aria-hidden to 17 files' decorative icons
- `scripts/social-content.js` — Posts to Twitter/X (OAuth 1.0a), LinkedIn (v2 API), Facebook (Graph API); falls back to text file
- `scripts/pinterest-poster.js` — Creates Pinterest pins via API v5; supports --dry-run
- `scripts/affiliate-linker.js` — Inserts contextual Amazon affiliate links from amazon-db.json
- `scripts/expand-thin-content.js` — Expands posts <700 words to 700+ via type-detect sections
- `scripts/generate-takeaways.js` — Generates AI Key Takeaways for all 195 posts (rule-based), stored in `public/data/takeaways.json`
- `scripts/social-scheduler.js` — Cron-ready scheduler that publishes pending social posts at their scheduled datetime; supports --dry-run
- `scripts/seo-meta-generator.js` — Scans all posts for excerpt length & missing-year issues; --fix applies suggestions

## Schemas
- `lib/schema.js` exports: `articleJsonLd`, `newsArticleJsonLd`, `breadcrumbJsonLd`, `faqJsonLd`, `howtoJsonLd`, `productReviewJsonLd`, `organizationJsonLd`, `listJsonLd`
- List/ItemList schema added to reviews, comparisons, tutorials, posts pages
- WebSite + SearchAction schema in root layout

## Components
- `ReadingProgress.js` — Fixed top-of-page blue progress bar
- `BackToTop.js` — Floating scroll-to-top button
- `CookieBanner.js` — GDPR consent banner
- `AuthorBio.js` — Avatar + social links on post pages
- `PaginationNav.js` — Prev/next + page X of Y (24/page)
- `NewsletterPopover.js` — Scroll-triggered popover at 40%, localStorage dismiss
- `KeyTakeaways.js` — Server component reading `public/data/takeaways.json`, renders numbered bullet list on post pages
- `admin/loading.js` — Loading spinner for admin page transitions
- `admin/Skeleton.js` — Skeleton shimmer loading (Skeleton, SkeletonCard, SkeletonText, SkeletonTable)
- `AdminSearch.js` — Cmd+K command palette for navigating admin pages and posts
- `Toast.js` — Toast notification system (success/error/info) with context provider
- `hooks/useAdminShortcuts.js` — Keyboard shortcuts (g+s → Stats, g+p → Performance, ? → help)

## Site Stats
- 669 posts (NOT 195 — old AGENTS.md was stale), 13+ categories, 55 controlled tags
- Build: 926 static pages, 0 errors (all admin pages dynamic)
- Tests: 175 passing (vitest) across 12 files
- Content Performance: 3 strong, 144 needs-improvement, 47 weak (Score 62/100)
- 0 corrupt frontmatter (doctor fixes any that appear)
- 0 remaining fake "spent N hours testing" claims (doctor strips them)
- openGraph metadata: all public pages covered
- Error boundaries: all dynamic routes covered (including paginated)
- Newsletter CTAs link to `/#newsletter` (works site-wide, not just homepage)

## Security Notes
- `middleware.js` guards BOTH `/admin` pages AND `/admin/api/*` (401 without session).
  The NextAuth handler `/admin/api/auth/*` is the only public exception.
  Do NOT re-add `api/` to the matcher exclusion — that reopened an unauthenticated
  GitHub Actions / deploy trigger (see 2026-08-30 audit).
- `NEXTAUTH_SECRET` MUST be set in production or auth silently fails open.

## Tests
- 95 tests across 9 files: `lib/__tests__/`
  - Unit: validate (21), rate-limit (7), activity-log (7), visits (15)
  - Integration (API routes): schedule (13), bulk-edit (6), categories (5), content-pipeline (11), tags (10)
- Integration tests use temp directories with inline fixtures; mock rate-limit & activity-log
- Run: `npm test` (vitest), `npm run test:watch`
- `vitest.config.js` includes `resolve.alias { '@': '.' }` for App Router route imports

## Installed Skills
- `humanizer` at `~/.claude/skills/humanizer/` — Removes signs of AI-generated writing (33 patterns)
<!-- SPECKIT END -->

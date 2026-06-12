<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan

## Admin Dashboard
- Located at `/admin/*` (Next.js app router), 11 pages: MC, Analytics, Posts, Queue, SEO, Reports, Content Gaps, Content Brief, Links, Deploy, Actions
- Protected by NextAuth with GitHub OAuth; custom middleware uses `getToken()` redirects to `/admin/login`
- API routes at `/admin/api/*` (not protected by middleware)
- Actions dispatch GitHub Actions workflows via `GITHUB_API_TOKEN`
- Landing page: Mission Control (agent cards grouped into 7 categories, live status dots, Run buttons)

## Key Scripts
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
- `admin/loading.js` — Loading spinner for admin page transitions

## Site Stats
- 195 posts, 13+ categories, 55 controlled tags
- Build: 359 static pages, 0 errors
- Content Performance: 3 strong, 144 needs-improvement, 47 weak (Score 62/100)
- 34 remaining SEO issues (all thin content <700 words — fixed via Groq on GitHub Actions)
- Tag pages: `force-dynamic` + `noindex` (not pre-rendered)
- openGraph metadata: all public pages covered
- Error boundaries: all dynamic routes covered (including paginated)
- Newsletter CTAs link to `/#newsletter` (works site-wide, not just homepage)

## Installed Skills
- `humanizer` at `~/.claude/skills/humanizer/` — Removes signs of AI-generated writing (33 patterns)
<!-- SPECKIT END -->

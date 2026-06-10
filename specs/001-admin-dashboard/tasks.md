# Tasks: Admin Dashboard

**Input**: specs/001-admin-dashboard/plan.md, spec.md

**Prerequisites**: Existing Next.js app with shadcn/ui, Tailwind CSS, lucide-react. Dependencies to install: next-auth, recharts.

**Organization**: Tasks grouped by user story in priority order.

## Phase 1: Setup — Dependencies & Auth

**Purpose**: Install packages, configure NextAuth, create admin layout

- [ ] T001 Install dependencies: next-auth, recharts
- [ ] T002 Create NextAuth configuration at `app/admin/api/auth/[...nextauth]/route.js` with GitHub OAuth
- [ ] T003 Create GitHub OAuth application credentials (client ID + secret) — add to `.env.local`
- [ ] T004 Create admin layout at `app/admin/layout.js` with:
  - Auth check (redirect to `/admin/login` if unauthenticated)
  - Sidebar navigation (Posts, Queue, SEO, Links, Deploy, Actions)
  - Admin header with user avatar + name from GitHub session
  - Dark/light mode support (reuse blog's existing theme)
- [ ] T005 Create login page at `app/admin/login/page.js` with "Sign in with GitHub" button

**Checkpoint**: Auth flow works — visiting `/admin` redirects to login, OAuth completes, sidebar renders

---

## Phase 2: Overview Page (User Story 1 — P1)

**Goal**: Main dashboard landing page with 4 stat cards

- [ ] T006 Create API route at `app/admin/api/stats/route.js` that aggregates:
  - Post count from GitHub API
  - Queue count from GitHub API
  - Avg SEO score from all posts
  - Last deploy status from Vercel API
  - Caches results with 5-min TTL
- [ ] T007 Create StatCard component at `components/admin/stat-card.js` with:
  - Icon, label, value, optional trend indicator
  - Loading skeleton state
  - Error state (dashed border + "Failed to load")
- [ ] T008 Create overview page at `app/admin/page.js` with 4 StatCards in a grid:
  - Total Posts (+ today's new posts)
  - Queue Items (+ consumed today)
  - Avg SEO Score (+ posts needing improvement)
  - Last Deploy (status badge + time ago)

**Checkpoint**: `/admin` shows 4 stat cards with real data

---

## Phase 3: Posts Table (User Story 2 — P1)

**Goal**: Searchable, sortable table of all blog posts

- [ ] T009 Create API route at `app/admin/api/posts/route.js` that:
  - Fetches `content/posts/*.mdx` via GitHub API
  - Parses frontmatter (title, slug, date, category, tags, seoScore, draft, rating)
  - Returns sorted by date descending
- [ ] T010 Create PostsTable component at `components/admin/posts-table.js` with:
  - Columns: Title (linked to post), Category (badge), Date, SEO Score (color-coded), Tags (truncated), Status (Published/Draft)
  - Search input that filters by title/slug client-side
  - Column header click for sorting (toggle asc/desc)
  - Pagination (20 per page)
  - Loading skeleton
- [ ] T011 Create posts page at `app/admin/posts/page.js` rendering PostsTable

**Checkpoint**: `/admin/posts` shows 187 posts in a sortable, searchable table

---

## Phase 4: Keyword Queue (User Story 3 — P2)

**Goal**: View and manage the keyword queue

- [ ] T012 Create API route at `app/admin/api/queue/route.js` that:
  - GET: fetches `scripts/keyword-queue.json` via GitHub API
  - POST: adds new topic via GitHub API content update
- [ ] T013 Create QueueList component at `components/admin/queue-list.js` with:
  - Total count header + category breakdown badges
  - Scrollable list of topics with category chips
  - "Add Topic" button opening a dialog form
- [ ] T014 Create queue page at `app/admin/queue/page.js`

**Checkpoint**: `/admin/queue` shows queue items and can add new topics

---

## Phase 5: SEO Dashboard (User Story 4 — P2)

**Goal**: Visualize SEO performance across posts

- [ ] T015 Create API route at `app/admin/api/seo/route.js` that computes:
  - Score distribution (buckets: 0-40, 40-60, 60-80, 80-100)
  - List of posts with score < 70 "Needs Improvement"
  - Average, min, max scores
- [ ] T016 Create SeoChart component at `components/admin/seo-chart.js` with:
  - Bar chart (recharts) showing score distribution
  - Summary stats cards (avg, min, max, posts below 70)
  - "Needs Improvement" table with posts + quick "Fix SEO" button
- [ ] T017 Create SEO page at `app/admin/seo/page.js`

**Checkpoint**: `/admin/seo` shows charts and improvement list

---

## Phase 6: Deploy Dashboard (User Story 5 — P3)

**Goal**: Monitor Vercel deployments and trigger new ones

- [ ] T018 Create API route at `app/admin/api/deploy/route.js` that:
  - GET: fetches deployments from Vercel API
  - POST: triggers new deployment via Vercel API
- [ ] T019 Create DeployList component at `components/admin/deploy-list.js` with:
  - Status badges (READY=green, BUILDING=yellow, QUEUED=blue, FAILED=red, CANCELED=gray)
  - Relative timestamps ("2 min ago")
  - "Trigger Deploy" button with confirmation
- [ ] T020 Create deploy page at `app/admin/deploy/page.js`

**Checkpoint**: `/admin/deploy` shows deployment history and trigger works

---

## Phase 7: Actions Center (User Story 6 — P3)

**Goal**: Run blog automation scripts from the dashboard

- [ ] T021 Create API route at `app/admin/api/actions/route.js` that dispatches GitHub Actions workflows
- [ ] T022 Create ActionCard component at `components/admin/action-card.js` with:
  - Icon, title, description
  - Input fields if needed (e.g., batch count for generate)
  - "Run" button that dispatches and shows status
- [ ] T023 Create actions page at `app/admin/actions/page.js` with cards for:
  - Generate Posts (input: batch count)
  - Polish All Posts
  - SEO Optimize All
  - Auto Internal Links
  - Refresh Content
  - Trigger Deploy (or link to Deploy page)

**Checkpoint**: `/admin/actions` shows action cards and dispatches workflows

---

## Phase 8: Polish & Cross-Cutting

- [ ] T024 Add loading states and error boundaries to all admin pages
- [ ] T025 Add `src/middleware.js` for NextAuth middleware (protect `/admin/*`)
- [ ] T026 Verify all API routes handle errors gracefully
- [ ] T027 Test full flow: login → overview → posts → queue → actions
- [ ] T028 Add `.opencode/` to `.gitignore` (security — agent config)

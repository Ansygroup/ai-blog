# Feature Specification: Admin Dashboard

**Feature Branch**: `001-admin-dashboard`

**Created**: 2026-06-10

**Status**: Draft

## User Scenarios & Testing

### User Story 1 — Login & Overview (Priority: P1)

The user visits `/admin`, is redirected to GitHub OAuth login, authenticates, and sees the main dashboard overview with key metrics.

**Why this priority**: Authentication gates all other pages; overview is the landing page and first thing users see.

**Independent Test**: Can be fully tested by visiting `/admin`, completing GitHub OAuth, and verifying 4 metric cards (Posts, Queue, SEO Score, Last Deploy) render with live data.

**Acceptance Scenarios**:
1. **Given** unauthenticated user visits `/admin`, **When** they access any admin route, **Then** they are redirected to `/admin/login` with a "Sign in with GitHub" button
2. **Given** user clicks "Sign in with GitHub", **When** OAuth completes successfully, **Then** they are redirected to `/admin` and see their GitHub avatar + name in the header
3. **Given** authenticated user is on `/admin`, **When** the page loads, **Then** they see 4 stat cards: Post Count, Queue Items, Avg SEO Score, and Last Deploy Status
4. **Given** data fails to load, **When** the dashboard tries to fetch, **Then** each card shows a fallback state (dashed border + "Failed to load")

---

### User Story 2 — Posts Table (Priority: P1)

The user navigates to `/admin/posts` and sees a searchable, filterable table of all 187 blog posts with key metadata.

**Why this priority**: Posts are the core content asset — users need to browse, search, and inspect them.

**Independent Test**: Can be tested by visiting `/admin/posts` and verifying the table renders with correct columns and search works.

**Acceptance Scenarios**:
1. **Given** user is on `/admin/posts`, **When** the page loads, **Then** they see a table with columns: Title, Category, Date, SEO Score, Tags, Status
2. **Given** user types in the search box, **When** they enter a keyword, **Then** the table filters to matching posts by title or slug
3. **Given** user clicks a column header, **When** they click "Date" or "SEO Score", **Then** the table sorts ascending/descending
4. **Given** user clicks a post row, **When** they click, **Then** they navigate to the post detail view or open the post in a new tab

---

### User Story 3 — Keyword Queue (Priority: P2)

The user navigates to `/admin/queue` and sees the keyword queue with pending and generated topics.

**Why this priority**: Queue management helps control content production pipeline.

**Independent Test**: Can be tested by visiting `/admin/queue` and verifying the queue count and topic list match the actual file.

**Acceptance Scenarios**:
1. **Given** user is on `/admin/queue`, **When** the page loads, **Then** they see total count, breakdown by category, and a scrollable list of pending topics
2. **Given** user wants to add a topic, **When** they click "Add Topic", **Then** a dialog opens with topic name, category, and keywords fields
3. **Given** user submits a new topic, **When** the form is valid, **Then** the topic is added via GitHub API commit to `scripts/keyword-queue.json`

---

### User Story 4 — SEO Dashboard (Priority: P2)

The user navigates to `/admin/seo` and sees SEO performance across all posts.

**Why this priority**: SEO is critical for traffic — dashboard should surface posts needing improvement.

**Independent Test**: Can be tested by verifying SEO score distribution chart renders and the "worst performers" list is accurate.

**Acceptance Scenarios**:
1. **Given** user is on `/admin/seo`, **When** the page loads, **Then** they see a histogram of SEO scores across all posts
2. **Given** there are posts with SEO scores below 70, **When** the page loads, **Then** they appear in a "Needs Improvement" section with quick-action buttons
3. **Given** user clicks "Fix SEO" on a post, **When** they confirm, **Then** a GitHub workflow dispatch triggers `seo-optimizer.js` for that post

---

### User Story 5 — Deploy Dashboard (Priority: P3)

The user navigates to `/admin/deploy` and sees Vercel deployment history and status.

**Why this priority**: Less frequent but essential for monitoring production health.

**Independent Test**: Can be tested by verifying the deploy list renders with correct status badges from Vercel API.

**Acceptance Scenarios**:
1. **Given** user is on `/admin/deploy`, **When** the page loads, **Then** they see last 10 deployments with status (READY/BUILDING/QUEUED/FAILED), timestamp, and URL
2. **Given** user clicks "Trigger Deploy", **When** confirmed, **Then** a new deployment is triggered via Vercel API
3. **Given** a deployment is in progress, **When** viewing the list, **Then** they see a live "BUILDING" indicator

---

### User Story 6 — Actions Center (Priority: P3)

The user navigates to `/admin/actions` and sees a control panel to run blog automation scripts.

**Why this priority**: Direct script execution from UI is powerful but less critical than viewing data.

**Independent Test**: Can be tested by verifying each action card renders with correct description and dispatch button.

**Acceptance Scenarios**:
1. **Given** user is on `/admin/actions`, **When** the page loads, **Then** they see action cards: Generate Posts, Polish All, SEO Fix, Internal Links, Refresh Content
2. **Given** user clicks "Generate Posts", **When** they enter a batch count, **Then** a GitHub workflow dispatch triggers `generate-post.js`
3. **Given** user clicks "Vercel Deploy", **When** confirmed, **Then** deployment is triggered and user is redirected to Deploy dashboard to watch progress

---

### Edge Cases

- What happens when GitHub API rate limits are hit? → Cache responses with 5-minute TTL, show stale data with "cached" badge
- What happens when Vercel API token is invalid? → Show "Configure Vercel token in settings" message
- What happens when the keyword queue is empty? → Show "Queue is empty — add topics via the form above"
- How does the dashboard handle 0 posts? → Show empty state with helpful message
- What if GitHub OAuth fails? → Show error page with retry button

## Requirements

### Functional Requirements

- **FR-001**: System MUST authenticate users via GitHub OAuth (NextAuth.js)
- **FR-002**: System MUST protect all `/admin/*` routes behind authentication
- **FR-003**: System MUST fetch post data from GitHub API (read `content/posts/*.mdx` frontmatter)
- **FR-004**: System MUST fetch keyword queue from GitHub API (read `scripts/keyword-queue.json`)
- **FR-005**: System MUST fetch deployment status from Vercel API
- **FR-006**: System MUST support triggering GitHub Actions via workflow_dispatch
- **FR-007**: System MUST support triggering Vercel deployments via Vercel API
- **FR-008**: System MUST display SEO scores parsed from post frontmatter
- **FR-009**: System MUST cache API responses to avoid rate limits (5-minute TTL)
- **FR-010**: System MUST reuse existing blog shadcn/ui components for consistent appearance

### Key Entities

- **Post**: Blog post with title, slug, excerpt, date, category, tags, seoScore, draft status
- **QueueItem**: Keyword queue entry with topic, category, keywords array
- **Deployment**: Vercel deployment with uid, url, readyState, createdAt, target
- **Action**: Runnable automation script with name, description, workflow file, input parameters

## Success Criteria

### Measurable Outcomes

- **SC-001**: User can log in with GitHub OAuth and see dashboard within 3 seconds
- **SC-002**: Posts table loads and renders 187 rows within 5 seconds
- **SC-003**: All major pages (Overview, Posts, Queue) load without errors
- **SC-004**: GitHub Actions dispatch triggers and Vercel deploy trigger work on first attempt
- **SC-005**: Dashboard matches blog's dark/light mode design

## Assumptions

- GitHub API is accessible and has access to the blog repository
- Vercel API token is stored in environment variables
- Supabase is accessible for GSC analytics data
- The blog's existing shadcn/ui setup is sufficient for all dashboard components
- GitHub Actions workflows exist for all automation actions (generate, polish, seo, links, refresh)

# AI Pulse Blog Dashboard Constitution

## Core Principles

### I. Read-Only Data Layer
All dashboard data comes from existing sources (GitHub API, Vercel API, Supabase). No new databases or storage. Data is fetched live and displayed as-is.

### II. Consistent Design System
Dashboard uses the same shadcn/ui + Tailwind CSS as the blog. Shared components live in `components/admin/`. Matches the blog's dark/light mode and typography.

### III. Minimal Backend
API routes are thin proxies to external APIs (Vercel, GitHub, Supabase). No business logic in the dashboard backend. All heavy lifting stays in the existing blog scripts.

### IV. Interaction via Workflows
All write operations (generate, polish, deploy) go through GitHub Actions workflow_dispatch or Vercel API. The dashboard never executes scripts directly — it dispatches, then shows status.

### V. Progressive Enhancement
Build in priority order: overview → posts → queue → SEO → links → deploy → actions. Each page is independently deployable and testable.

## Security Requirements

- GitHub OAuth via NextAuth.js — any GitHub account can authenticate
- All API tokens (Vercel, GitHub PAT) stored server-side in environment variables, never exposed to client
- Admin routes under `/admin/*` — non-authenticated users redirected to `/admin/login`
- Session management via NextAuth JWT

## Development Workflow

- Build pages in the existing Next.js App Router under `app/admin/`
- Use Server Components by default, Client Components only when needed (charts, interactivity)
- Reuse existing blog components (Button, Card, Badge, etc.) from `components/ui/`
- Test by running `npm run dev` and visiting `/admin` locally
- One git commit per page or logical feature

**Version**: 1.0.0 | **Ratified**: 2026-06-10 | **Last Amended**: 2026-06-10

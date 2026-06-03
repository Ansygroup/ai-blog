# MASTER PLAN: AI Pulse Daily — 14 Agent System

## Status: ✅ DEPLOYED (All 14 agents live)

---

## Part A: New Workflows (10 files)

| # | File | Agent | Schedule | Purpose |
|---|------|-------|----------|---------|
| 1 | `.github/workflows/editor-agent.yml` | Editor | on PR | Validates content quality, comments on PR |
| 2 | `.github/workflows/social-agent.yml` | Social | on push main | LinkedIn/Twitter posts for new content |
| 3 | `.github/workflows/analytics-agent.yml` | Analytics | weekly Sun | GSC + GA4 analysis, recommendations |
| 4 | `.github/workflows/programmatic-seo-agent.yml` | Programmatic | daily | X vs Y comparison pages, directories |
| 5 | `.github/workflows/geo-agent.yml` | GEO | weekly Sat | llms.txt, AI optimization, citations |
| 6 | `.github/workflows/refresh-agent.yml` | Refresh | daily | Update stale posts, dates, stats |
| 7 | `.github/workflows/newsletter-agent.yml` | Newsletter | weekly Mon | Compile and send weekly digest |
| 8 | `.github/workflows/amazon-affiliate-agent.yml` | Amazon Affiliate | on publish | Insert affiliate links, track |
| 9 | `.github/workflows/bing-trust-agent.yml` | Bing Trust | daily | Bing URL submission, IndexNow, monitor |
| 10 | `.github/workflows/pinterest-agent.yml` | Pinterest | on publish | Auto-generate pins, schedule, boards |

---

## Part B: Code Changes (6 files)

| # | File | Change |
|---|------|--------|
| 1 | `scripts/generate-post.js` | Fix frontmatter leakage, improve prompt for 2500+ words, prevent duplicate headings |
| 2 | `app/posts/[slug]/page.js` | Activate `productReviewJsonLd` (rating → stars) + `howtoJsonLd` (tutorials) |
| 3 | `lib/markdown.js` | Add `rehype-slug` + `rehype-autolink-headings` for anchor links |
| 4 | `tailwind.config.js` | Add `darkMode: 'class'` + dark theme colors |
| 5 | `app/layout.js` | Add dark mode class handling + theme script |
| 6 | `components/Header.js` | Add theme toggle button |

## Part C: New Components (3 files)

| # | File | Description |
|---|------|-------------|
| 1 | `components/TableOfContents.js` | Sticky TOC sidebar for long posts |
| 2 | `components/ShareButtons.js` | Twitter/LinkedIn/Reddit/HN share buttons |
| 3 | `components/ThemeToggle.js` | Dark/light mode toggle |

## Part D: Env Variables

```env
# Amazon Affiliate (مسجل)
AMAZON_ASSOCIATES_TAG=ansy07-20       # Tracking ID
AMAZON_STORE_ID=aibolg-20             # Store ID

# Social (اختياري — نضيفه بعدين)
LINKEDIN_ACCESS_TOKEN=                # LinkedIn API token

# Pinterest (حساب Business مجاني)
PINTEREST_ACCESS_TOKEN=               # Pinterest API token
PINTEREST_BOARD_ID=                   # Default board ID
```

---

## Execution Order

```
Phase 1: Code fixes + Components (B + C)
  → Commit: "feat: content quality, schema, dark mode, TOC, share"
  
Phase 2: New workflows (A)  
  → Commit: "feat: 9 new agent workflows — editor, social, analytics, seo, geo, refresh, newsletter, affiliate, bing"

Phase 3: Push all → System goes live
```

## Validation

After deployment:
- [ ] Check `editor-agent.yml` triggers on next PR
- [ ] Verify `productReviewJsonLd` generates star ratings
- [ ] Dark mode toggle works
- [ ] TOC anchors appear on long posts
- [ ] Share buttons render
- [ ] All 9 workflows appear in GitHub Actions

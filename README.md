# ==============================================
# AI NICHE BLOG SYSTEM — README
# ==============================================
# A complete, production-ready blog platform optimized for:
#   1. Google search (SEO)
#   2. AI search engines — ChatGPT, Perplexity, Gemini (GEO)
#   3. Multiple monetization streams
#   4. 24/7 automated content publishing
#
# Stack: Next.js 14 (App Router) + Tailwind + MDX + OpenAI
# Hosting: Vercel (free) or any Node host
# ==============================================

## QUICK START (15 minutes to first deploy)

### 1. Install + configure
```bash
cd ai-blog
npm install
cp .env.example .env.local
# Edit .env.local — at minimum, set:
#   NEXT_PUBLIC_SITE_URL=https://yourdomain.com
#   NEXT_PUBLIC_SITE_NAME="Your AI Blog"
#   OPENAI_API_KEY=sk-...   (for content generation)
```

### 2. Run locally
```bash
npm run dev
# Open http://localhost:3000
```

### 3. Build for production
```bash
npm run build
npm start
```

---

## DEPLOY TO VERCEL (free, ~5 minutes)

1. Push this folder to a GitHub repo.
2. Go to https://vercel.com/new → import your repo.
3. Add the env vars from `.env.example` in the Vercel project settings.
4. Click Deploy. Vercel gives you a `*.vercel.app` URL.
5. Buy a domain (Namecheap / Cloudflare Registrar) and add it in Vercel.
6. Cloudflare → point nameservers to Cloudflare → enable free CDN + auto-HTTPS.

---

## MONETIZATION — 4 STREAMS, ALL ENABLED

### A. Display ads (passive)
1. Apply to Google AdSense: https://www.google.com/adsense
   - Required: 20+ quality posts, Privacy + About + Contact pages (✓ all included)
   - Add your AdSense client ID to `.env.local`
2. Apply to Ezoic at 10K monthly visitors (better RPM than AdSense).
3. Apply to Mediavine at 50K monthly visitors (premium).

### B. Affiliate links (highest ROI in AI niche)
- **Jasper AI** — $40-$125 per sale. Affiliate dashboard: https://jasper.ai/partners
- **Surfer SEO** — 50% recurring. https://surferseo.com/affiliates
- **Copy.ai** — $30-$300 per sale. https://copy.ai/affiliates
- **NordVPN** — 40-100% commission. https://nordvpn.com/affiliate
- **Amazon AI books + courses** — 1-4% but high volume
- **Impact.com, PartnerStack, ShareASale** — aggregator networks with hundreds of AI tools

Add your affiliate IDs to `.env.local`. The system already wires up the most common ones.

### C. Sponsored posts
- Charge $500-$5,000 per sponsored review (after you hit 20K monthly visitors).
- Use the editorial standards on the About page to justify pricing.
- Always label sponsored posts as "Sponsored" at the top.

### D. Digital products
- Build AI prompt packs / Notion templates / mini-courses
- Sell via Gumroad or Lemon Squeezy
- 80%+ margins

### Realistic revenue timeline:
| Monthly visitors | Realistic monthly revenue |
|---|---|
| 1,000 | $0-50 (mostly affiliates) |
| 10,000 | $200-1,000 (ads + affiliates) |
| 50,000 | $2,000-8,000 |
| 100,000 | $5,000-25,000 |
| 500,000+ | $25,000-100,000+ |

---

## 24/7 CONTENT ENGINE

The blog writes and publishes itself:

```bash
# Single post by topic
node scripts/generate-post.js "best ai tools for lawyers 2026"

# Batch — drain the keyword queue (15 starter topics in scripts/keyword-queue.json)
node scripts/generate-post.js --from-keywords

# Process 5 posts in a row
node scripts/generate-post.js --from-keywords --batch 5
```

### AI providers (all supported, all have free tiers)

Set `AI_PROVIDER` in `.env.local`. The script auto-detects which keys you have.

| Provider | Free? | Speed | Best for | Get key |
|---|---|---|---|---|
| **groq** (default) | ✅ Yes | ⚡ Fastest | Best free choice | https://console.groq.com/keys |
| **openrouter** | ✅ Yes | Fast | Many model choices | https://openrouter.ai/keys |
| **gemini** | ✅ Yes | Fast | 1M-token context | https://aistudio.google.com/app/apikey |
| **ollama** | ✅ Local | Slowest | Privacy / no internet | https://ollama.com/ |
| **openai** | 💳 Paid | Fast | Best quality | https://platform.openai.com/api-keys |

Free-tier limits (plenty for 1-5 posts/day):
- **Groq:** 30 req/min, 14,400 req/day
- **OpenRouter:** 20 req/min, 200 req/day
- **Gemini:** 15 req/min, 1,500 req/day

The script:
1. Calls the selected AI provider with a battle-tested E-E-A-T prompt
2. Generates 2,200-2,800 words of SEO + GEO-optimized content
3. Saves to `content/posts/<slug>.mdx` (real .mdx file with frontmatter)
4. Rate-limits politely between posts (2s sleep)
5. Pings IndexNow on next deploy → instant indexing by Bing → ChatGPT/Perplexity

**To go fully automatic:**
- The GitHub Action (`.github/workflows/deploy.yml`) drains the queue on every push
- Add a cron schedule (e.g., every 6 hours) to auto-publish 1 post/day

```yaml
# Add to .github/workflows/deploy.yml for daily auto-publish
on:
  schedule:
    - cron: '0 */6 * * *'   # every 6 hours
```

---

## SEO + GEO (Generative Engine Optimization) — what's wired up

### Classic SEO ✓
- Server-rendered HTML (Next.js App Router, no client JS for content)
- Auto-generated sitemap.xml (`/sitemap.xml`)
- RSS feed (`/rss.xml`) + JSON Feed (`/feed.json`)
- Semantic HTML5, proper heading hierarchy
- Open Graph + Twitter Card meta tags
- JSON-LD structured data: Article, FAQ, HowTo, Product, Organization, BreadcrumbList, WebSite
- Mobile-first responsive design
- Image optimization (AVIF/WebP, lazy loading)
- Canonical URLs on every page
- Internal linking via categories and tags
- Author pages with byline + E-E-A-T signals

### GEO (AI Search Engines) ✓ — this is the new frontier
- **llms.txt** — a "guide" file that tells LLMs about your site (https://llmstxt.org standard)
- **robots.txt** — explicitly allows GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended
- **JSON Feed** — clean structured data for AI ingestion
- **IndexNow** — instant Bing indexing (powers ChatGPT browse, Perplexity)
- **Bing Webmaster Tools** — submit sitemap manually once
- **FAQ schema on every post** — AI engines love FAQ structured data, quote it directly
- **Quick Answer section** at the top of every AI-generated post — optimized to be cited by Perplexity/ChatGPT
- **"Key Takeaways" callout** — pulled as TL;DR by AI engines
- **E-E-A-T signals** — author byline, methodology section, "last updated" date, affiliate disclosure
- **Source citations** in every AI-generated article

---

## RANKING CHECKLIST (first 90 days)

### Day 1 — setup
- [x] Deploy site to Vercel
- [x] Add domain + Cloudflare
- [x] Submit sitemap to Google Search Console
- [x] Submit sitemap to Bing Webmaster Tools
- [x] Generate IndexNow key, add to .env
- [x] Sign up for Plausible or GA4
- [x] Set up Google AdSense (or apply)
- [x] Sign up for 5 affiliate programs

### Week 1 — content
- [x] Generate 5 best-of posts from keyword queue
- [x] Generate 5 comparison posts
- [x] Generate 5 tutorial posts
- [x] Add cover images (Unsplash, midjourney, or your own)
- [x] Run `npm run seo:audit` to catch issues
- [x] Manually verify each post renders correctly

### Month 1 — distribution
- [ ] Share each post on Reddit (r/AItools, r/ChatGPT, r/sideproject, niche subs)
- [ ] Post on Hacker News if relevant
- [ ] Submit to Product Hunt if it's a "best of" list
- [ ] Cross-post to Medium, LinkedIn, dev.to (canonical back to your site)
- [ ] Build 3-5 backlinks via guest posts

### Month 2-3 — scale
- [ ] Set up automated daily publishing (cron)
- [ ] Aim for 30+ posts indexed
- [ ] Build email list to 1,000 subscribers
- [ ] Reach 5,000 monthly visitors
- [ ] Apply to Ezoic if you hit 10K

---

## FILE STRUCTURE

```
ai-blog/
├── app/                    # Next.js App Router pages
│   ├── page.js             # Homepage (hero + featured + grid)
│   ├── posts/[slug]/       # Individual post page
│   ├── category/[slug]/    # Category landing pages
│   ├── tag/[slug]/         # Tag pages
│   ├── reviews/            # All reviews
│   ├── search/             # Client-side search
│   ├── about/              # About page
│   ├── privacy/            # Privacy policy (required for AdSense)
│   ├── terms/              # Terms of service
│   ├── disclosure/         # Affiliate disclosure (required by FTC)
│   ├── contact/            # Contact page
│   ├── rss.xml/            # RSS feed
│   ├── feed.json/          # JSON Feed (for AI engines)
│   ├── sitemap.xml/        # Dynamic sitemap
│   ├── layout.js           # Root layout (analytics, ads, schema)
│   └── globals.css         # Tailwind + custom prose styles
├── components/
│   ├── Header.js           # Sticky nav
│   ├── Footer.js           # Footer with disclosure
│   ├── PostCard.js         # Article preview card
│   ├── AdSlot.js           # AdSense wrapper
│   └── NewsletterCTA.js    # Email capture
├── content/posts/          # All blog posts (MDX)
├── lib/
│   ├── config.js           # Site config (name, url, keywords, affiliates)
│   ├── posts.js            # MDX loading
│   ├── markdown.js         # Safe markdown rendering (XSS-safe)
│   └── schema.js           # JSON-LD generators
├── scripts/
│   ├── generate-post.js    # AI content engine (OpenAI)
│   ├── keyword-queue.json  # 15 starter topics
│   ├── indexnow-submit.js  # Ping Bing/AI engines
│   └── seo-audit.js        # Pre-publish checklist
├── public/
│   ├── robots.txt          # SEO + GEO crawler permissions
│   └── llms.txt            # AI engine guide
├── .github/workflows/
│   └── deploy.yml          # Auto-deploy + auto-publish
└── .env.example            # All config vars documented
```

---

## LICENSE & LEGAL

- Original content: all rights reserved
- Code: MIT
- Affiliate disclosure required by FTC: see /disclosure page

---

Built for the AI gold rush of 2026. Go make money.

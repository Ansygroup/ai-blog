# PRE-LAUNCH CHECKLIST

Complete this in order. Each step is one task. Time estimates are real.

## Phase 1 — Pick your domain (Day 1, 30 min)

A great niche-AI blog domain is short, brandable, and has a `.com` if possible.

Candidate formulas (pick or invent your own):
- `[topic] + .com`           → e.g. aipulse.com, neurapress.com
- `[keyword]hub.com`         → e.g. aiwritehub.com
- `best + [keyword] + .com` → e.g. bestaitools.com
- `[brand] + ai/blog`       → e.g. nora.ai, maxblog.ai

**Where to buy:**
- Cloudflare Registrar: https://dash.cloudflare.com → best prices, no markup
- Namecheap: https://namecheap.com → solid, frequent promos
- Porkbun: https://porkbun.com → cheapest, less polish

Cost: $8-15/year for `.com`, $1-5 for `.ai`/`.io`.

**Avoid:** hyphenated names (looks spammy), >2 words, anything that doesn't pass the "radio test" (sounds OK when said aloud).

## Phase 2 — Push to GitHub (Day 1, 15 min)

```bash
cd C:\Users\ansy0\ai-blog
git init
git add .
git commit -m "initial: ai blog system v1.0 with 15 posts"
gh repo create ai-blog --public --source=. --remote=origin --push
```

If you don't have `gh` CLI, do it manually:
1. Create empty repo at https://github.com/new (name: ai-blog, public, no README)
2. Run the three commands GitHub shows you under "push an existing repository"

## Phase 3 — Deploy to Vercel (Day 1, 10 min)

1. Go to https://vercel.com/new
2. Click "Import" next to your `ai-blog` repo
3. Vercel auto-detects Next.js — no config needed
4. **Add environment variables** before clicking Deploy (copy from `.env.local`):
   - `NEXT_PUBLIC_SITE_URL` = your real domain (e.g. `https://aipulse.com`)
   - `NEXT_PUBLIC_SITE_NAME` = "AI Pulse Daily" (or your brand)
   - `GROQ_API_KEY` = your real key
   - `AI_PROVIDER` = `groq`
   - `INDEXNOW_KEY` = a random UUID (https://www.uuidgenerator.net/)
5. Click Deploy. Wait ~2 min.
6. You get a `https://ai-blog-xxx.vercel.app` URL. Visit it to confirm.

## Phase 4 — Connect your domain (Day 1, 20 min)

In Vercel:
1. Project Settings → Domains → Add your domain
2. Vercel shows the DNS records you need (usually a CNAME for `www` and an A record for the apex)
3. Go to your registrar (Cloudflare/Namecheap) and add those records
4. Wait 5-30 min for DNS propagation
5. Vercel auto-issues a free SSL cert

## Phase 5 — Set up Cloudflare (Day 1, 15 min)

Cloudflare is free and gives you CDN + bot protection + faster global load.

1. Sign up at https://dash.cloudflare.com (free)
2. Add your domain → Cloudflare scans existing DNS records
3. At your registrar, change nameservers to the two Cloudflare nameservers they show you
4. Wait 5-60 min for nameserver propagation
5. In Cloudflare DNS, make sure the Vercel records (added in Phase 4) are present
6. Turn ON:
   - SSL/TLS → Full (strict)
   - Speed → Auto Minify (HTML, CSS, JS)
   - Security → Bot Fight Mode
   - Caching → Standard

## Phase 6 — Submit to Google + Bing (Day 2, 20 min)

**Google Search Console:** https://search.google.com/search-console
1. Add property → URL prefix → enter your full https:// domain
2. Verify via DNS TXT record (Cloudflare → DNS → Add record)
3. Sitemaps → submit `https://yourdomain.com/sitemap.xml`
4. URL Inspection → test one post URL → click "Request indexing"

**Bing Webmaster Tools:** https://www.bing.com/webmasters
1. Add site (same domain)
2. Verify (easiest: import from Google Search Console)
3. Sitemaps → submit your sitemap URL
4. **Important:** This powers ChatGPT browse + Perplexity indexing. Don't skip.

**IndexNow:** Your `INDEXNOW_KEY` is in the URL. The deploy script auto-pings IndexNow on every push. Verify at https://www.bing.com/indexnow.

## Phase 7 — Apply for monetization (Day 2-7, parallel)

Apply to all 4 on day 2. They take days/weeks to approve, so submit early.

**Google AdSense:** https://www.google.com/adsense
- Required: live domain, 20+ quality posts, Privacy + About + Contact pages ✓ all done
- Fill in: your domain, payment info, tax info
- Once approved: add `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-xxx` to Vercel env, redeploy

**Affiliate programs** (apply to all, takes 5-10 min each):
- Jasper AI Partners: https://jasper.ai/partners (highest commission, $40-125/sale)
- Surfer SEO: https://surferseo.com/affiliates (50% recurring)
- Copy.ai: https://copy.ai/affiliates ($30-300/sale)
- NordVPN: https://nordvpn.com/affiliate (40-100% commission)
- Amazon Associates: https://affiliate-program.amazon.com (for AI books/hardware)
- ShareASale / Impact: aggregators with hundreds of AI tools

**Email capture (ConvertKit free tier):** https://convertkit.com
- Sign up, create a form
- Paste the form action URL into `NEXT_PUBLIC_NEWSLETTER_FORM_ACTION` env
- Redeploy

**Optional sponsored-post pricing** (set up in your About page once you have traffic):
- 10K monthly visitors → charge $300-500 per post
- 50K monthly visitors → charge $1,500-3,000 per post
- 100K+ monthly visitors → charge $5,000+ per post

## Phase 8 — Analytics + monitoring (Day 2, 15 min)

**Plausible (privacy-first, no cookie banner needed):** https://plausible.io
- Add site, get snippet
- Set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=yourdomain.com` in Vercel env
- Redeploy

**Microsoft Clarity (free, unlimited heatmaps + session recordings):** https://clarity.microsoft.com
- Add project, get ID
- Set `NEXT_PUBLIC_CLARITY_ID=xxx` in Vercel env
- Redeploy

**Google Analytics 4** (optional — Plausible covers most use cases): https://analytics.google.com

## Phase 9 — Set up 24/7 auto-publishing (Day 3, 30 min)

The blog should publish 1-2 new posts per day automatically.

**Add more topics to the queue:**
- Edit `scripts/keyword-queue.json`
- Add 30-50 high-intent AI niche topics (use AnswerThePublic, Semrush, or just brainstorm)
- Categories to cover: Best Of, Comparisons, Tutorials, Reviews

**Set up GitHub Actions cron:**
- Edit `.github/workflows/deploy.yml`
- Add to the top:
  ```yaml
  on:
    schedule:
      - cron: '0 */8 * * *'   # every 8 hours
    workflow_dispatch:        # manual trigger
  ```
- Add a job that runs `node scripts/generate-post.js --from-keywords` on schedule
- Add the Groq key to GitHub repo secrets (Settings → Secrets → Actions → `GROQ_API_KEY`)

**Set up IndexNow on every push:**
- The deploy workflow already calls `scripts/indexnow-submit.js`
- Make sure `INDEXNOW_KEY` is in repo secrets too

## Phase 10 — First-week promotion (Day 3-7, 1-2 hours total)

Distribute each new post to get initial traffic + backlinks.

For every new post:
1. **Reddit** — post to relevant subs (r/AItools, r/ChatGPT, r/sideproject, r/SaaS, r/marketing)
2. **Hacker News** — if it's a list or research piece, "Show HN" it
3. **Medium** — repost with canonical link back to your post (use `?utm_source=medium` URL params)
4. **LinkedIn** — share a 200-word takeaway, link to full post
5. **Dev.to** — cross-post (canonical URL = your post)
6. **Twitter/X** — short thread (3-5 tweets) with the post link
7. **Quora** — answer 1-2 related questions with a link back

Track which channels send traffic via UTM params (`?utm_source=reddit` etc.) and double down on what works.

## Phase 11 — Scale + measure (Month 2+)

**Weekly:**
- Generate 2-3 new posts
- Update 1-2 old "best of" posts with new data (Google rewards freshness)

**Monthly:**
- Re-rank all affiliate programs by commission rate
- Test AdSense vs Ezoic (apply to Ezoic at 10K sessions)
- Re-check Search Console for new keyword opportunities
- Update llms.txt with new authoritative pages

**Quarterly:**
- Re-test all reviewed tools (re-publish with new "Last updated" date)
- Refresh cover images
- Audit SEO (run `node scripts/seo-audit.js`)
- Backup content to a private GitHub repo (just in case)

## Realistic revenue timeline

| Monthly visitors | Realistic monthly revenue |
|---|---|
| 1,000 | $0-50 (mostly affiliate clicks) |
| 5,000 | $50-300 |
| 10,000 | $200-1,000 (AdSense + affiliates) |
| 25,000 | $500-2,500 |
| 50,000 | $2,000-8,000 |
| 100,000 | $5,000-25,000 |
| 500,000+ | $25,000-100,000+ |

Most niche blogs hit 10K monthly visitors around month 6-9 with consistent publishing + promotion.

---

## What to skip for now

- ❌ Custom email servers (use ConvertKit, Mailchimp, or Buttondown)
- ❌ Custom analytics (Plausible covers 95% of use cases)
- ❌ Premium themes (the design is clean and conversion-focused already)
- ❌ Image generation (use Unsplash, free)
- ❌ Translation / i18n (add when you have traffic)
- ❌ Membership / paywall (kills traffic growth, add only if you have a specific use)

---

## When to come back to me

- When you hit 10K monthly visitors and want to add Ezoic
- When a tool you reviewed changes pricing/features and you want a refresh workflow
- When you want to expand into a second niche (e.g. add a "best AI tools for lawyers" sub-section)
- When you want to set up a Discord bot that posts new articles to your community
- When something breaks in production and you need debug help

Good luck. The hard part isn't the build — it's the daily publishing and promotion. Be consistent.

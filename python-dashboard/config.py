import os

GITHUB_TOKEN = os.environ.get("GITHUB_API_TOKEN", "")
REPO = "Ansygroup/ai-blog"
REFRESH_INTERVAL_MS = 30000

CATEGORIES = [
    {"id": "generation", "label": "Content Generation", "color": "#3B82F6"},
    {"id": "quality", "label": "Quality & SEO", "color": "#22C55E"},
    {"id": "distribution", "label": "Distribution", "color": "#A855F7"},
    {"id": "intelligence", "label": "Intelligence", "color": "#F97316"},
    {"id": "monetization", "label": "Monetization", "color": "#EAB308"},
    {"id": "maintenance", "label": "Maintenance", "color": "#64748B"},
    {"id": "infra", "label": "Infrastructure", "color": "#06B6D4"},
]

AGENTS = [
    {"id": "agent-supervisor", "name": "Supervisor Agent", "category": "generation", "desc": "Main content generation — batch article creation with quality gating", "emoji": "\U0001f9e0", "workflow": "agent-supervisor.yml", "schedule": "Every 4h", "tier": "core"},
    {"id": "intelligence-loop", "name": "Intelligence Loop", "category": "generation", "desc": "Self-improvement cycle: strategy \u2192 SEO \u2192 refresh \u2192 generate \u2192 link", "emoji": "\U0001f504", "workflow": "intelligence-loop.yml", "schedule": "Daily 6am", "tier": "core"},
    {"id": "scheduled-content", "name": "Scheduled Content", "category": "generation", "desc": "Hourly post generation from keyword queue", "emoji": "\u23f0", "workflow": "scheduled-content.yml", "schedule": "Every hour", "tier": "core"},
    {"id": "queue-refill", "name": "Queue Refill", "category": "generation", "desc": "Keep keyword queue stocked with AI-generated topics", "emoji": "\U0001f4e5", "workflow": "queue-refill.yml", "schedule": "Every 6h", "tier": "support"},
    {"id": "programmatic-seo", "name": "Programmatic SEO", "category": "generation", "desc": "Programmatic page generation for scaled content", "emoji": "\u2699\ufe0f", "workflow": "programmatic-seo-agent.yml", "schedule": "Manual", "tier": "support"},
    {"id": "editor-agent", "name": "Editor Agent", "category": "quality", "desc": "PR content quality review \u2014 frontmatter, length, structure", "emoji": "\U0001f4dd", "workflow": "editor-agent.yml", "schedule": "On PR", "tier": "core"},
    {"id": "seo-audit", "name": "SEO Audit", "category": "quality", "desc": "Automated SEO checks on all posts", "emoji": "\U0001f50d", "workflow": "seo-audit.yml", "schedule": "On PR", "tier": "core"},
    {"id": "geo-agent", "name": "GEO Agent", "category": "quality", "desc": "AI engine optimization \u2014 Quick Answers, key takeaways", "emoji": "\U0001f310", "workflow": "geo-agent.yml", "schedule": "Weekly Sat", "tier": "support"},
    {"id": "humanize-posts", "name": "Humanizer", "category": "quality", "desc": "Remove AI writing patterns \u2014 natural language rewrite", "emoji": "\u270d\ufe0f", "workflow": "humanize-posts.yml", "schedule": "Manual", "tier": "support"},
    {"id": "polish-posts", "name": "Polish Agent", "category": "quality", "desc": "Formatting cleanup, excerpt expansion, bio insertion", "emoji": "\u2728", "workflow": "polish-posts.yml", "schedule": "Manual", "tier": "support"},
    {"id": "social-agent", "name": "Social Agent", "category": "distribution", "desc": "Share new posts on social media platforms", "emoji": "\U0001f4e2", "workflow": "social-agent.yml", "schedule": "On publish", "tier": "core"},
    {"id": "pinterest-agent", "name": "Pinterest Agent", "category": "distribution", "desc": "Auto pin generation for new content", "emoji": "\U0001f4cc", "workflow": "pinterest-agent.yml", "schedule": "On publish", "tier": "support"},
    {"id": "newsletter-agent", "name": "Newsletter Agent", "category": "distribution", "desc": "Weekly digest compilation and sending", "emoji": "\U0001f4e7", "workflow": "newsletter-agent.yml", "schedule": "Weekly Mon", "tier": "core"},
    {"id": "analytics-agent", "name": "Analytics Agent", "category": "intelligence", "desc": "Weekly performance review and recommendations", "emoji": "\U0001f4ca", "workflow": "analytics-agent.yml", "schedule": "Weekly Sun", "tier": "support"},
    {"id": "amazon-affiliate", "name": "Amazon Affiliate", "category": "monetization", "desc": "Affiliate link insertion into product posts", "emoji": "\U0001f6d2", "workflow": "amazon-affiliate-agent.yml", "schedule": "On publish", "tier": "support"},
    {"id": "amazon-intelligence", "name": "Amazon Intelligence", "category": "monetization", "desc": "Amazon product data scraping and analysis", "emoji": "\U0001f4e6", "workflow": "amazon-intelligence.yml", "schedule": "Manual", "tier": "support"},
    {"id": "refresh-agent", "name": "Refresh Agent", "category": "maintenance", "desc": "Update stale posts with fresh dates", "emoji": "\U0001f504", "workflow": "refresh-agent.yml", "schedule": "Daily 4am", "tier": "support"},
    {"id": "auto-internal-link", "name": "Link Agent", "category": "maintenance", "desc": "Auto internal linking between related posts", "emoji": "\U0001f517", "workflow": "auto-internal-link.yml", "schedule": "Manual", "tier": "support"},
    {"id": "bing-trust", "name": "Bing Trust Agent", "category": "maintenance", "desc": "Bing Webmaster Tools indexing", "emoji": "\U0001f50e", "workflow": "bing-trust-agent.yml", "schedule": "Manual", "tier": "support"},
    {"id": "deploy", "name": "Deploy Pipeline", "category": "infra", "desc": "Build \u2192 Vercel deploy \u2192 IndexNow submit", "emoji": "\U0001f680", "workflow": "deploy.yml", "schedule": "On push", "tier": "core"},
]

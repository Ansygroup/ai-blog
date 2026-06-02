// Centralized site config — change once, used everywhere
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'AI Pulse Daily',
  tagline: process.env.NEXT_PUBLIC_SITE_TAGLINE || 'Honest AI tool reviews, tutorials, and rankings for 2026',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com',
  description: 'In-depth AI tool reviews, ChatGPT tutorials, prompt engineering guides, and AI tool comparisons. Updated daily for marketers, creators, and developers.',
  author: 'AI Pulse Editorial',
  email: 'hello@yourdomain.com',
  twitter: '@yourhandle',
  // 30 high-intent AI niche keywords (mix of head terms + long tail)
  keywords: [
    'best AI tools 2026', 'AI tools for marketers', 'AI content generators', 'ChatGPT alternatives',
    'AI image generators', 'free AI tools', 'AI writing assistants', 'AI SEO tools',
    'Claude vs ChatGPT', 'GPT-4 vs Gemini', 'AI video generators', 'AI code assistants',
    'prompt engineering', 'AI for small business', 'AI productivity tools', 'Jasper AI review',
    'Copy.ai review', 'Surfer SEO review', 'AI tools comparison', 'best AI tools for content',
    'AI tools for students', 'AI tools for designers', 'AI automation', 'AI workflow tools',
    'AI copywriting', 'AI blog writing', 'AI email marketing', 'AI social media tools',
    'AI tools for YouTube', 'AI tools for ecommerce',
  ],
  social: {
    twitter: 'https://twitter.com/yourhandle',
    linkedin: 'https://linkedin.com/company/yourblog',
    youtube: 'https://youtube.com/@yourhandle',
  },
  // For llms.txt (which AI models use as a "guide" to your content)
  aiDescription: `${process.env.NEXT_PUBLIC_SITE_NAME || 'AI Pulse Daily'} is an independent publication that publishes expert reviews, comparisons, and tutorials about consumer and professional AI tools. Content is fact-checked, updated quarterly, and written for practitioners. We cite sources and disclose affiliate relationships.`,
};

export const monetization = {
  // Affiliate programs with high payouts in the AI niche
  affiliates: [
    { name: 'Jasper AI', slug: 'jasper', cta: 'Try Jasper — 7-day free trial', url: `https://jasper.ai?fpr=${process.env.AFFILIATE_JASPER_ID || 'YOURID'}`, commission: '$40-125/sale' },
    { name: 'Surfer SEO', slug: 'surfer', cta: 'Try Surfer SEO', url: `https://surferseo.com/?fpr=${process.env.AFFILIATE_SURFER_ID || 'YOURID'}`, commission: '~50% recurring' },
    { name: 'NordVPN', slug: 'nordvpn', cta: 'Get NordVPN 70% off', url: `https://nordvpn.com/${process.env.AFFILIATE_NORDVPN_ID || 'YOURID'}`, commission: '40-100%' },
    { name: 'Copy.ai', slug: 'copyai', cta: 'Try Copy.ai free', url: 'https://copy.ai', commission: '$30-300' },
  ],
};

// Prices below were read from each vendor's own pricing page on 27 Nov 2026.
// A tool with no price listed here had no readable price on its page that day.
export const BEST_UPDATED = '2026-11-27';
export const BEST_UPDATED_LABEL = '27 November 2026';

export const BEST_PICKS = [
  { need: 'General chat assistant', pick: 'ChatGPT', why: 'Broadest feature set: reasoning models, image creation, deep research, Codex', price: 'Free, Go, Plus and Pro tiers (prices not shown on the page we could read)', url: 'https://chatgpt.com/pricing' },
  { need: 'Writing and long documents', pick: 'Claude', why: 'Free tier; Pro adds higher limits', price: 'Free; Pro $17/mo billed annually ($20 monthly); Max $100/mo', url: 'https://claude.com/pricing' },
  { need: 'Research with citations', pick: 'Perplexity', why: 'Answers with citations in every response, deep research on Pro', price: 'Free; Pro $17/mo billed annually; Max $167/mo billed annually', url: 'https://www.perplexity.ai/pro' },
  { need: 'Google apps users', pick: 'Gemini (Google AI plans)', why: 'Gemini inside Gmail, Docs, Sheets, plus storage bundled in the plan', price: 'Google AI Plus $4.99/mo; Pro and Ultra prices not readable on the page', url: 'https://one.google.com/about/google-ai-plans/' },
  { need: 'Coding in an editor', pick: 'Cursor', why: 'AI-first code editor with a free tier', price: 'Free; Plus $8/mo; Premium $30/mo; Super $100/mo; Ultra $200/mo', url: 'https://cursor.com/pricing' },
  { need: 'Coding inside GitHub', pick: 'GitHub Copilot', why: 'Works across GitHub and common editors; has a free plan', price: 'Free $0; Pro $10/mo; Pro+ $39/mo; Max $100/mo', url: 'https://github.com/features/copilot/plans' },
  { need: 'Voice and text to speech', pick: 'ElevenLabs', why: 'Free tier to test voices before paying', price: 'Free; Starter $6/mo; Creator $22/mo; Pro $99/mo; Scale $299/mo (Black Friday discounts shown on the page)', url: 'https://elevenlabs.io/pricing' },
];

export const BEST_FAQS = [
  { question: 'What is the best AI tool overall in 2026?', answer: 'There is no single best tool. For general chat and mixed tasks most people start with ChatGPT, Claude or Gemini. Pick by the job: Perplexity for cited research, Cursor or GitHub Copilot for code, ElevenLabs for voice. All three chat tools have free tiers, so test them on your own work first.' },
  { question: 'Are these AI tools free?', answer: 'Claude, Perplexity, Cursor, GitHub Copilot and ElevenLabs list a $0 plan on their pricing pages as of 27 November 2026. Free plans have usage limits. Paid plans range from about $5 to $20 a month for individuals, with $100 to $300 tiers for heavy users.' },
  { question: 'How do you check prices on this page?', answer: 'We read each price from the vendor\'s own pricing page and record the date. Where a page did not show a price in readable text, we say so instead of guessing. Prices change often, so check the linked page before you pay.' },
  { question: 'Which AI tool is best for coding?', answer: 'Cursor (an editor built around AI) and GitHub Copilot (works inside GitHub and common editors) both have free plans. Copilot Pro is $10 a month and Cursor Plus is $8 a month on their pages today. Try the free tier of each on one real project.' },
  { question: 'How often is this list updated?', answer: 'We re-check the listed prices and add tools as we verify them. The last check was 27 November 2026.' },
];

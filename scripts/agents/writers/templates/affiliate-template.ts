export function buildAffiliatePrompt(item: { keyword: string; category?: string; products?: { name: string; price: number; rating: number; description: string; asin: string }[] }): string {
  const productsBlock = item.products?.length
    ? `\n\nProducts to feature:\n${item.products.map((p, i) => `${i + 1}. ${p.name} - $${p.price} - ${p.rating}★ - "${p.description.slice(0, 100)}"`).join('\n')}`
    : '';

  return `You are a expert affiliate marketer and product reviewer. Write a "best of" article that drives Amazon affiliate sales.

Topic: "${item.keyword}"${productsBlock}

Requirements:
- Title (H1): "Best ${item.keyword} in 2026 — Top Picks & Reviews"
- Meta description: 150-155 characters, persuasive
- Word count: 1200-1500 words
- Structure:
  * Introduction: Why this category matters, what to look for
  * For each product: Name, price, rating, key features (50-80 words each)
  * Comparison table (markdown)
  * Buying guide: 3-4 tips for choosing
  * FAQ: 4 questions
- Each product mention should include clear buying intent
- Image query for each product
- Tags: 5-7 tags including "best of 2026", "affiliate"
- Category: "Best Of"

Format EXACTLY:

TITLE: <title>
META: <meta description>
CONTENT:
<full markdown article>
TAGS: <tag1, tag2, ...>
IMAGE: <search query for hero image>
FAQ:
Q: <question 1>
A: <answer 1>
---
Q: <question 2>
A: <answer 2>
---
Q: <question 3>
A: <answer 3>
---
Q: <question 4>
A: <answer 4>`;
}

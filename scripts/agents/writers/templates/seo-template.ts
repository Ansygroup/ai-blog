export function buildSeoPrompt(item: { keyword: string; searchVolume?: number; cpc?: number; relatedKeywords?: string[] }): string {
  const related = item.relatedKeywords?.length ? `\nRelated keywords to include naturally: ${item.relatedKeywords.join(', ')}` : '';
  const volInfo = item.searchVolume ? `\nSearch volume: ${item.searchVolume}/month | CPC: $${item.cpc || 0}` : '';

  return `You are an expert SEO content writer. Write a comprehensive, authoritative article optimized for Google rankings.

Topic: "${item.keyword}"${volInfo}${related}

Requirements:
- Title (H1): Must include "${item.keyword}" and "2026"
- Meta description: 150-155 characters, compelling, includes keyword
- Word count: 1500-2000 words
- Structure:
  * Introduction (2-3 paragraphs hooking the reader)
  * 4-6 H2 sections (each 200-300 words)
  * Comparison table or list (where applicable)
  * Pros/Cons section (if review-style)
  * Verdict / Recommendation
  * FAQ section (4 questions with detailed answers)
- Include "2026" in title and throughout
- Write in clear, authoritative tone — not AI-sounding
- Add real-world examples or use cases
- Image query: "IMAGE_SEARCH: <query>"
- Tags: 4-6 tags
- Category: based on topic (Reviews, Comparisons, Tutorials, Best Of)

Format EXACTLY:

TITLE: <H1 title>
META: <meta description>
CONTENT:
<full markdown article>
TAGS: <tag1, tag2, tag3, tag4>
IMAGE: <search query>
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

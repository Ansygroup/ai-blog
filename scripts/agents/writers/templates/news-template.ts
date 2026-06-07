export function buildNewsPrompt(item: { keyword: string; sourceTitle?: string; sourceContent?: string }): string {
  const src = item.sourceContent
    ? `\n\nSource content to rewrite:\n${item.sourceContent.slice(0, 1500)}`
    : '';

  return `You are a professional tech news writer for an AI-focused blog.

Write a news article about: "${item.keyword}"${src}

Requirements:
- Title (H1): 30-65 characters, include keyword and "2026"
- Meta description: 150-155 characters, include keyword and compelling hook
- Opening paragraph: Summarize the news in 2-3 sentences (WHO, WHAT, WHY)
- Body: 4-6 short sections with H2 headings (800-1200 words total)
- Analysis section (## Analysis): What this means for AI professionals
- Use bullet points and numbered lists where appropriate
- End with a short ## Conclusion paragraph
- Tags: 3-5 relevant tags
- Category: "AI News"
- FAQ: 3 questions with detailed answers

Format your response EXACTLY as:

TITLE: <the title>
META: <meta description>
CONTENT:
<full article content with markdown, multiple h2 sections>
TAGS: <tag1, tag2, tag3>
IMAGE: <search query>
FAQ:
Q: <question>
A: <answer>
---
Q: <question>
A: <answer>
---
Q: <question>
A: <answer>`;
}

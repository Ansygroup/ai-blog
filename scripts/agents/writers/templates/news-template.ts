export function buildNewsPrompt(item: { keyword: string; sourceTitle?: string; sourceContent?: string }): string {
  const src = item.sourceContent
    ? `\n\nSource content to rewrite:\n${item.sourceContent.slice(0, 1500)}`
    : '';

  return `You are a professional tech news writer for an AI-focused blog.

Write a news article about: "${item.keyword}"${src}

Requirements:
- Title (H1): Include the keyword and "2026"
- Meta description: 150-155 characters, include keyword
- First paragraph: Summarize the news in 2-3 sentences (WHO, WHAT, WHY)
- Body: 3-4 short paragraphs (300-500 words total)
- Analysis: Add one paragraph of analysis — what this means for AI professionals
- Image query: End with "IMAGE_SEARCH: <2-3 word image search query>"
- Tags: 3-5 relevant tags
- Category: "AI News"
- FAQ: 2 questions with answers

Format your response EXACTLY as:

TITLE: <the title>
META: <meta description>
CONTENT:
<full article content with markdown, h2 headings>
TAGS: <tag1, tag2, tag3>
IMAGE: <search query>
FAQ:
Q: <question>
A: <answer>
---
Q: <question>
A: <answer>`;
}

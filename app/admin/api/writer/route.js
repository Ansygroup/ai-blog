export const dynamic = 'force-dynamic';

import { groqGenerate, groqJson } from '../../../../lib/groq';

export async function POST(req) {
  try {
    const { action, content, title, category, tags, instruction } = await req.json();

    switch (action) {
      case 'generate': {
        const prompt = `Write a blog post section about "${title}"${category ? ` in the category "${category}"` : ''}${tags?.length ? `. Relevant tags: ${tags.join(', ')}` : ''}. Write in natural, conversational English as an industry expert sharing genuine experience. Avoid promotional language, inflated claims, and AI-sounding phrases. Use specific examples and practical advice.`;
        const result = await groqGenerate(prompt, { temperature: 0.7, maxTokens: 2048 });
        return Response.json({ content: result || 'AI generation unavailable (no API key).' });
      }

      case 'rewrite': {
        if (!content) return Response.json({ error: 'No content provided' }, { status: 400 });
        const prompt = `Rewrite the following text to be more engaging, natural, and human-sounding. Keep the same information but improve clarity and flow. Avoid AI-sounding phrases.\n\n---\n${content.slice(0, 3000)}`;
        const result = await groqGenerate(prompt, { temperature: 0.5, maxTokens: 2048 });
        return Response.json({ content: result || content });
      }

      case 'expand': {
        if (!content) return Response.json({ error: 'No content provided' }, { status: 400 });
        const prompt = `Expand the following text by adding more detail, examples, and practical advice. Keep the same tone and style. Add at least 100 words.\n\n---\n${content.slice(0, 2000)}`;
        const result = await groqGenerate(prompt, { temperature: 0.6, maxTokens: 2048 });
        return Response.json({ content: result || content });
      }

      case 'suggest-seo': {
        if (!content) return Response.json({ error: 'No content provided' }, { status: 400 });
        const prompt = `Analyze this blog post content for SEO. Suggest: 1) A compelling title (max 60 chars), 2) An excerpt (120-160 chars), 3) 3-5 relevant tags, 4) 3 improvements. Return JSON with keys: title, excerpt, tags (array), improvements (array of strings).\n\n---\n${content.slice(0, 3000)}`;
        const result = await groqJson(prompt, { temperature: 0.3 });
        return Response.json(result || { improvements: ['AI optimization unavailable'] });
      }

      case 'custom': {
        if (!instruction) return Response.json({ error: 'No instruction provided' }, { status: 400 });
        const prompt = `${instruction}\n\nContext - Title: "${title || 'N/A'}"\nCategory: "${category || 'N/A'}"\nContent:\n---\n${(content || '').slice(0, 2000)}`;
        const result = await groqGenerate(prompt, { temperature: 0.6, maxTokens: 2048 });
        return Response.json({ content: result || 'AI unavailable.' });
      }

      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

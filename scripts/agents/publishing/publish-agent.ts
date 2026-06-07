import * as fs from 'fs';
import * as path from 'path';
import type { Article, PublishedPage } from '../../../lib/types';
import { insertPage, slugExists, updateQueueStatus } from '../../../lib/db';

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

interface PublishResult {
  success: boolean;
  filePath?: string;
  slug?: string;
  error?: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'article-' + Date.now();
}

function buildFrontmatter(article: Article): string {
  const tags = article.tags.map(t => `"${t.trim().replace(/"/g, '\\"')}"`).join(', ');
  return `---
title: "${article.title.replace(/"/g, '\\"')}"
date: ${new Date().toISOString().split('T')[0]}
lastUpdated: ${new Date().toISOString().split('T')[0]}
category: "${article.category}"
excerpt: "${article.excerpt.replace(/"/g, '\\"').replace(/\n/g, ' ').slice(0, 160)}"
cover: ${article.coverImage || 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80'}
tags: [${tags}]
rating: ${article.rating || 0}
readingTime: ${Math.max(1, Math.ceil(article.wordCount / 200))}
seoScore: ${article.seoScore}
featured: false${article.source ? `\nsource: "${article.source}"` : ''}
---

`;
}

function buildFAQSection(faqs: { question: string; answer: string }[]): string {
  if (!faqs.length) return '';
  return `\n\n## Frequently Asked Questions\n\n${faqs.map(f => `### ${f.question}\n\n${f.answer}\n`).join('\n')}`;
}

function cleanMarkdown(content: string): string {
  return content
    .replace(/^##\s+\d+[\.\)]\s*/gm, '## ')  // clean numbered H2s
    .split('\n').filter(line => {
      const t = line.trim();
      return !t.startsWith('```') || t === '```' || t.startsWith('```');
    }).join('\n');
}

export async function publishArticle(article: Article, queueItemId?: string): Promise<PublishResult> {
  try {
    const slug = article.slug || slugify(article.title);

    const slugOk = await slugExists(slug);
    if (slugOk) {
      return { success: false, slug, error: `Slug "${slug}" exists in DB` };
    }

    const filePath = path.join(POSTS_DIR, `${slug}.mdx`);
    if (fs.existsSync(filePath)) {
      return { success: false, slug, error: `File ${slug}.mdx exists` };
    }

    const frontmatter = buildFrontmatter(article);
    const body = cleanMarkdown(article.content);
    const faq = buildFAQSection(article.faqs);
    const fullContent = frontmatter + body + faq + '\n';

    fs.writeFileSync(filePath, fullContent, 'utf-8');

    const page = {
      slug,
      keyword: article.title,
      type: article.category === 'AI News' ? 'news' : 'article',
      word_count: article.wordCount,
      seo_score: article.seoScore,
      cover_image: article.coverImage || '',
      status: 'active',
      queue_item_id: queueItemId || null,
    };

    await insertPage(page);
    if (queueItemId) await updateQueueStatus(queueItemId, 'published');

    return { success: true, filePath, slug };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function parseArticleFromGroq(raw: string, keyword: string): Article | null {
  try {
    let title: string;
    let meta: string;
    let content: string;
    let tags: string[] = [];
    let imageQuery = 'AI technology';
    let faqs: { question: string; answer: string }[] = [];

    const titleMatch = raw.match(/^TITLE:\s*(.+)$/m);
    title = titleMatch?.[1]?.trim() || keyword;

    const metaMatch = raw.match(/^META:\s*(.+)$/m);
    meta = metaMatch?.[1]?.trim() || title.slice(0, 155);

    // Extract content — between CONTENT: and TAGS:/IMAGE:/FAQ:
    const contentStart = raw.indexOf('CONTENT:');
    if (contentStart >= 0) {
      const afterContent = raw.slice(contentStart + 8);
      const endIdx = Math.min(
        afterContent.search(/^TAGS:\s/m) >= 0 ? afterContent.search(/^TAGS:\s/m) : Infinity,
        afterContent.search(/^IMAGE:\s/m) >= 0 ? afterContent.search(/^IMAGE:\s/m) : Infinity,
        afterContent.search(/^FAQ:\s/m) >= 0 ? afterContent.search(/^FAQ:\s/m) : Infinity,
      );
      content = afterContent.slice(0, endIdx).trim();
    } else {
      content = raw;
    }

    if (!content || content.length < 100) content = raw;

    // Tags
    const tagsMatch = raw.match(/^TAGS:\s*(.+)$/m);
    if (tagsMatch) {
      tags = tagsMatch[1].split(/[,，、]/).map(t => t.trim()).filter(Boolean);
    }

    // Image query
    const imgMatch = raw.match(/^IMAGE:\s*(.+)$/m);
    if (imgMatch) imageQuery = imgMatch[1].trim();

    // FAQ
    const faqSections = raw.split(/\nQ:\s*/);
    if (faqSections.length > 1) {
      faqs = faqSections.slice(1).map(block => {
        const lines = block.split('\n');
        const q = lines[0]?.trim() || '';
        const aLines: string[] = [];
        let capture = false;
        for (const line of lines.slice(1)) {
          const t = line.trim();
          if (t.startsWith('A:')) {
            capture = true;
            aLines.push(t.replace(/^A:\s*/i, ''));
          } else if (capture) {
            if (t.startsWith('---') || t.match(/^Q:/i)) continue;
            if (t) aLines.push(t);
          }
        }
        const a = aLines.join('\n').trim();
        return { question: q, answer: a };
      }).filter(f => f.question && f.answer && f.answer.length > 10);
    }

    const wordCount = content.split(/\s+/).length;
    const slug = slugify(title);

    const lower = content.toLowerCase();
    const category = lower.includes('review') ? 'Reviews' :
      lower.includes('comparison') || lower.includes('vs ') ? 'Comparisons' :
      lower.includes('best ') || lower.includes('top ') ? 'Best Of' :
      lower.includes('tutorial') || lower.includes('guide') || lower.includes('how to') ? 'Tutorials' :
      lower.includes('news') || lower.includes('announce') || lower.includes('launch') || wordCount < 600 ? 'AI News' :
      'AI News';

    const excerpt = meta.length > 10 ? meta :
      content.replace(/[#*`]/g, '').replace(/\n+/g, ' ').trim().slice(0, 155);

    return {
      title,
      slug: slug || 'article',
      content,
      excerpt: excerpt.slice(0, 160),
      metaDescription: meta.slice(0, 160),
      coverImage: '',
      imageAttribution: undefined,
      tags: tags.length ? tags : [keyword.split(' ').slice(0, 3).join(' ')],
      category,
      faqs,
      wordCount,
      seoScore: 0,
    };
  } catch (err) {
    console.error('  ⚠️ Parse error:', (err as Error).message);
    return null;
  }
}

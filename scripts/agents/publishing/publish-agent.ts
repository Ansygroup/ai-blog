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
    .slice(0, 80);
}

function buildFrontmatter(article: Article): string {
  const tags = article.tags.map(t => `"${t.trim()}"`).join(', ');
  return `---
title: "${article.title.replace(/"/g, '\\"')}"
date: ${new Date().toISOString().split('T')[0]}
lastUpdated: ${new Date().toISOString().split('T')[0]}
category: "${article.category}"
excerpt: "${article.excerpt.replace(/"/g, '\\"')}"
cover: ${article.coverImage}
tags: [${tags}]
rating: ${article.rating || 0}
readingTime: ${Math.max(1, Math.ceil(article.wordCount / 200))}
seoScore: ${article.seoScore}
featured: false
---

`;
}

function buildFAQSection(faqs: { question: string; answer: string }[]): string {
  if (!faqs.length) return '';
  return `\n\n## Frequently Asked Questions\n\n${faqs.map(f => `### ${f.question}\n\n${f.answer}\n`).join('\n')}`;
}

export async function publishArticle(article: Article, queueItemId?: string): Promise<PublishResult> {
  try {
    const slug = article.slug || slugify(article.title);

    if (await slugExists(slug)) {
      return { success: false, slug, error: `Slug "${slug}" already exists in DB` };
    }

    const filePath = path.join(POSTS_DIR, `${slug}.mdx`);

    if (fs.existsSync(filePath)) {
      return { success: false, slug, error: `File ${slug}.mdx already exists on disk` };
    }

    const frontmatter = buildFrontmatter(article);
    const faq = buildFAQSection(article.faqs);
    const fullContent = frontmatter + article.content + faq + '\n';

    fs.writeFileSync(filePath, fullContent, 'utf-8');

    const page: Omit<PublishedPage, 'id' | 'created_at' | 'updated_at'> = {
      slug,
      keyword: article.title,
      type: article.category === 'AI News' ? 'news' : 'article',
      word_count: article.wordCount,
      seo_score: article.seoScore,
      cover_image: article.coverImage,
      status: 'active',
      queue_item_id: queueItemId,
    };

    await insertPage(page);

    if (queueItemId) {
      await updateQueueStatus(queueItemId, 'published');
    }

    return { success: true, filePath, slug };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function parseArticleFromGroq(raw: string, keyword: string): Article | null {
  try {
    const title = raw.match(/TITLE:\s*(.+)/)?.[1]?.trim() || keyword;
    const meta = raw.match(/META:\s*(.+)/)?.[1]?.trim() || '';
    const contentMatch = raw.match(/CONTENT:\s*([\s\S]*?)(?=TAGS:|IMAGE:|FAQ:)/);
    const content = contentMatch?.[1]?.trim() || raw;
    const tagsLine = raw.match(/TAGS:\s*(.+)/)?.[1]?.trim() || '';
    const tags = tagsLine.split(',').map(t => t.trim()).filter(Boolean);
    const imageLine = raw.match(/IMAGE:\s*(.+)/)?.[1]?.trim() || 'AI technology';
    const faqBlocks = raw.split(/Q:\s*/).slice(1);
    const faqs = faqBlocks.map(block => {
      const [q, ...aParts] = block.split('\nA:');
      return { question: q?.trim() || '', answer: aParts.join('\nA:').trim() || '' };
    }).filter(f => f.question && f.answer);

    const wordCount = content.split(/\s+/).length;
    const slug = slugify(title);
    const category = content.toLowerCase().includes('review') ? 'Reviews' :
                     content.toLowerCase().includes('comparison') ? 'Comparisons' :
                     content.toLowerCase().includes('best') ? 'Best Of' :
                     content.toLowerCase().includes('tutorial') ? 'Tutorials' : 'AI News';

    return {
      title,
      slug,
      content,
      excerpt: meta || content.slice(0, 155).replace(/\n/g, ' '),
      metaDescription: meta,
      coverImage: '',
      imageAttribution: undefined,
      tags: tags.length ? tags : [keyword],
      category,
      faqs: faqs.length ? faqs : [],
      wordCount,
      seoScore: 0,
    };
  } catch {
    return null;
  }
}

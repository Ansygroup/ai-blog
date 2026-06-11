import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getAllPosts, getPostBySlug, getRelatedPosts } from '../../../lib/posts';
import { renderSafeMarkdown } from '../../../lib/markdown';
import { newsArticleJsonLd, breadcrumbJsonLd } from '../../../lib/schema';
import { siteConfig } from '../../../lib/config';
import TableOfContents from '../../../components/TableOfContents';
import ShareButtons from '../../../components/ShareButtons';
import AdSlot from '../../../components/AdSlot';
import NewsletterCTA from '../../../components/NewsletterCTA';
import { Plus } from 'lucide-react';

export const dynamic = 'force-static';
export const revalidate = 1800;

export function generateStaticParams() {
  const all = getAllPosts();
  return all.filter(p => p.category === 'AI News').map(s => ({ slug: s.slug }));
}

export function generateMetadata({ params }) {
  const post = getPostBySlug(params.slug);
  if (!post) return {};
  return {
    title: `${post.title} | AI News`,
    description: post.excerpt || post.description,
    keywords: post.tags,
    alternates: { canonical: `${siteConfig.url}/news/${post.slug}` },
    openGraph: { title: post.title, description: post.excerpt, type: 'article', publishedTime: post.date, images: [{ url: `${siteConfig.url}/og/${post.slug}`, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title: post.title, description: post.excerpt, images: [`${siteConfig.url}/og/${post.slug}`] },
  };
}

function extractKeyTakeaways(content) {
  const match = content.match(/^## Key Takeaways\s*\n([\s\S]*?)(?=\n## |\n# |$)/m);
  if (!match) return null;
  return match[1].trim();
}

function removeKeyTakeaways(content) {
  return content.replace(/^## Key Takeaways\s*\n[\s\S]*?(?=\n## |\n# |$)/m, '').trim();
}

function parseFAQs(content) {
  const faqMatch = content.match(/##\s*FAQ[^\n]*\n([\s\S]+?)(?=\n##\s|\n#\s|$)/i);
  if (!faqMatch) return [];
  const items = faqMatch[1].split(/(?=Q:)/);
  return items.map((b) => {
    const q = b.match(/Q:\s*(.+?)(?:\n|$)/);
    const a = b.match(/A:\s*(.+)/);
    if (!q || !a) return null;
    return { question: q[1].trim(), answer: a[1].trim() };
  }).filter(Boolean);
}

export default async function NewsArticlePage({ params }) {
  const post = getPostBySlug(params.slug);
  if (!post || post.category !== 'AI News') notFound();

  const takeawaysContent = extractKeyTakeaways(post.content);
  const mainContent = takeawaysContent ? removeKeyTakeaways(post.content) : post.content;
  const contentHtml = await renderSafeMarkdown(mainContent);
  const takeawaysHtml = takeawaysContent ? await renderSafeMarkdown(takeawaysContent) : null;
  const related = getRelatedPosts(post.slug, post.category, post.tags, 3);
  const faqs = parseFAQs(mainContent);
  const url = `${siteConfig.url}/news/${post.slug}`;

  return (
    <>
      <script id="ld-news" type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify(newsArticleJsonLd(post, url)),
      }} />
      <script id="ld-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify(breadcrumbJsonLd([
          { name: 'Home', url: siteConfig.url },
          { name: 'AI News', url: `${siteConfig.url}/news` },
          { name: post.title, url: `${siteConfig.url}/news/${post.slug}` },
        ])),
      }} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-blue-600">Home</Link> / <Link href="/news" className="hover:text-blue-600">AI News</Link>
        </nav>

        <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-10">
          {/* Main content */}
          <article>
            <header className="mb-8">
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-3 flex-wrap">
                <time>{new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</time>
                {post.readingTime && <span>· {post.readingTime} min read</span>}
                {post.source && <span className="text-xs bg-slate-100 dark:bg-dark-bg px-2 py-0.5 rounded-full">via {post.source.replace(/^rss:/, '')}</span>}
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">{post.title}</h1>
              {post.cover && <div className="relative w-full aspect-video mb-6 rounded-xl overflow-hidden"><Image src={post.cover} alt={post.title} fill className="object-cover" sizes="(max-width: 800px) 100vw, 800px" /></div>}
            </header>

            {takeawaysHtml && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6 mb-8">
                <h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-300 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Key Takeaways
                </h2>
                <div className="prose-blog prose-sm max-w-none text-emerald-700 dark:text-emerald-200" dangerouslySetInnerHTML={{ __html: takeawaysHtml }} />
              </div>
            )}

            <div className="prose-blog max-w-none" dangerouslySetInnerHTML={{ __html: contentHtml }} />

            {/* FAQ section */}
            {faqs.length > 0 && (
              <section className="mt-12 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
                <div className="space-y-3">
                  {faqs.map((f, i) => (
                    <details key={i} className="bg-white dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-lg p-4 group">
                      <summary className="font-semibold cursor-pointer flex justify-between items-center">
                        {f.question}
                        <Plus className="w-5 h-5 text-blue-600 group-open:rotate-45 transition shrink-0" />
                      </summary>
                      <p className="mt-3 text-slate-700 dark:text-dark-muted">{f.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {/* Tags */}
            {post.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-slate-200 dark:border-dark-border">
                {post.tags.map(t => (
                  <Link key={t} href={`/tag/${t.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="text-sm bg-slate-100 dark:bg-dark-card px-3 py-1 rounded-full hover:bg-blue-100 transition">{t}</Link>
                ))}
              </div>
            )}

            <ShareButtons title={post.title} url={url} />

            {related.length > 0 && (
              <section className="mt-10 pt-6 border-t border-slate-200 dark:border-dark-border">
                <h2 className="text-xl font-bold mb-4">Related News</h2>
                <div className="grid sm:grid-cols-3 gap-4">
                  {related.map(p => (
                    <Link key={p.slug} href={`/news/${p.slug}`} className="group bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4 hover:shadow-md transition">
                      <p className="text-xs text-slate-500 mb-1">{new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                      <p className="font-semibold text-sm group-hover:text-blue-600 line-clamp-2">{p.title}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            <NewsletterCTA />
          </article>

          {/* Sidebar */}
          <aside className="hidden lg:block space-y-8">
            <TableOfContents />
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
              <h3 className="font-bold text-lg mb-2">Free AI Brief</h3>
              <p className="text-sm text-slate-700 dark:text-dark-muted mb-3">The 5 biggest AI tool launches and deals every week.</p>
              <a href="#newsletter" className="block text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition">Subscribe Free</a>
            </div>
            <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDE} />
            {related.length > 0 && (
              <div>
                <h3 className="font-bold text-lg mb-3">Related</h3>
                <div className="space-y-3">
                  {related.slice(0, 3).map((p) => (
                    <Link key={p.slug} href={`/news/${p.slug}`} className="block group">
                      <p className="text-xs text-slate-500 mb-0.5">{new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                      <p className="text-sm font-medium group-hover:text-blue-600 line-clamp-2">{p.title}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}

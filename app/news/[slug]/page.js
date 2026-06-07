import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllPosts, getPostBySlug, getRelatedPosts } from '../../../lib/posts';
import { renderSafeMarkdown } from '../../../lib/markdown';
import { articleJsonLd, breadcrumbJsonLd } from '../../../lib/schema';
import { siteConfig } from '../../../lib/config';

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
    alternates: { canonical: `${siteConfig.url}/news/${post.slug}` },
    openGraph: { title: post.title, description: post.excerpt, type: 'article', publishedTime: post.date },
  };
}

export default function NewsArticlePage({ params }) {
  const post = getPostBySlug(params.slug);
  if (!post || post.category !== 'AI News') notFound();

  const contentHtml = renderSafeMarkdown(post.content);
  const related = getRelatedPosts(post.slug, post.category, post.tags, 3);

  return (
    <>
      <script id="ld-news" type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify(articleJsonLd(post, siteConfig)),
      }} />
      <script id="ld-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify(breadcrumbJsonLd([
          { name: 'Home', url: siteConfig.url },
          { name: 'AI News', url: `${siteConfig.url}/news` },
          { name: post.title, url: `${siteConfig.url}/news/${post.slug}` },
        ])),
      }} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-blue-600">Home</Link> / <Link href="/news" className="hover:text-blue-600">AI News</Link>
        </nav>

        <article>
          <header className="mb-8">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-3 flex-wrap">
              <time>{new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</time>
              {post.readingTime && <span>· {post.readingTime} min read</span>}
              {post.source && <span className="text-xs bg-slate-100 dark:bg-dark-bg px-2 py-0.5 rounded-full">via {post.source.replace(/^rss:/, '')}</span>}
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">{post.title}</h1>
            {post.cover && <img src={post.cover} alt={post.title} width={800} height={450} className="w-full aspect-video object-cover rounded-xl mb-6" />}
          </header>

          <div className="prose-blog max-w-none" dangerouslySetInnerHTML={{ __html: contentHtml }} />
        </article>

        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-slate-200 dark:border-dark-border">
            {post.tags.map(t => (
              <Link key={t} href={`/tag/${t.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="text-sm bg-slate-100 dark:bg-dark-card px-3 py-1 rounded-full hover:bg-blue-100 transition">{t}</Link>
            ))}
          </div>
        )}

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
      </div>
    </>
  );
}

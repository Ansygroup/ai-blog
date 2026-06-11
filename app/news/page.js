import Link from 'next/link';
import { getAllPosts } from '../../lib/posts';
import { siteConfig } from '../../lib/config';

export const dynamic = 'force-static';
export const revalidate = 1800;

export const metadata = {
  title: 'AI News — Latest Artificial Intelligence Updates 2026',
  description: 'Breaking AI news, research breakthroughs, product launches, and industry analysis. Updated continuously.',
  alternates: { canonical: `${siteConfig.url}/news` },
  openGraph: {
    title: "AI Pulse Daily — AI News",
    description: "Latest AI news, breakthroughs, and industry updates. Stay informed with daily AI coverage.",
    url: siteConfig.url + '/news',
    siteName: siteConfig.name,
    type: 'website',
  },
};

export default function NewsPage() {
  const allPosts = getAllPosts();
  const news = allPosts.filter(p => p.category === 'AI News').slice(0, 50);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'AI News',
    description: 'Breaking AI news, research breakthroughs, product launches, and industry analysis.',
    url: `${siteConfig.url}/news`,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: siteConfig.url },
        { '@type': 'ListItem', position: 2, name: 'AI News', item: `${siteConfig.url}/news` },
      ],
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: news.slice(0, 10).map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${siteConfig.url}/news/${p.slug}`,
      })),
    },
  };

  return (
    <>
      <script id="ld-news-listing" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-blue-600">Home</Link> / <span className="text-slate-700 dark:text-dark-text font-medium">AI News</span>
        </nav>
        <header className="mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">AI News</h1>
          <p className="text-lg text-slate-600 dark:text-dark-muted">Latest breakthroughs, product launches, and analysis.</p>
        </header>

      <div className="space-y-6">
        {news.map((p) => (
          <article key={p.slug} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5 hover:shadow-md transition">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
              <time>{new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</time>
              {p.readingTime && <span>· {p.readingTime} min read</span>}
            </div>
            <h2 className="text-xl font-bold mb-2">
              <Link href={`/news/${p.slug}`} className="hover:text-blue-600 transition">{p.title}</Link>
            </h2>
            {p.excerpt && <p className="text-slate-600 dark:text-dark-muted text-sm line-clamp-2">{p.excerpt}</p>}
            <div className="flex items-center gap-2 mt-3">
              {p.tags?.slice(0, 3).map(t => (
              <span key={t} className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">{t}</span>
            ))}
            {p.source && <span className="text-xs text-slate-400 dark:text-dark-muted ml-2">via {p.source.replace(/^rss:/, '')}</span>}
            <Link href={`/news/${p.slug}`} className="text-xs text-blue-600 hover:underline ml-auto">Read more →</Link>
            </div>
          </article>
        ))}
        {news.length === 0 && <p className="text-slate-500">No news articles yet. Check back soon.</p>}
      </div>

      <div className="mt-10 text-center">
        <Link href="/posts" className="text-blue-600 hover:underline">View all articles →</Link>
      </div>
    </div>
    </>
  );
}

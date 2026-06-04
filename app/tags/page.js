import Link from 'next/link';
import { getAllTags, slugify } from '../../lib/posts';
import { siteConfig } from '../../lib/config';
import { breadcrumbJsonLd } from '../../lib/schema';

export const dynamic = 'force-static';

export const metadata = {
  title: 'All Tags — Browse AI Tool Topics',
  description: 'Browse all AI tool topics and categories by tag. Find articles about ChatGPT, Claude, Midjourney, AI writing, image generation, and more.',
  alternates: { canonical: `${siteConfig.url}/tags` },
  openGraph: {
    title: 'All Tags — Browse AI Tool Topics',
    description: 'Browse all AI tool topics by tag.',
    url: `${siteConfig.url}/tags`,
    siteName: siteConfig.name,
    type: 'website',
  },
};

export default function TagsPage() {
  const tags = getAllTags().sort((a, b) => b.count - a.count);
  const columns = [[], [], []];
  tags.forEach((t, i) => columns[i % 3].push(t));

  return (
    <>
      <script id="ld-tags-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: siteConfig.url },
        { name: 'Tags', url: `${siteConfig.url}/tags` },
      ])) }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-sm text-slate-500 dark:text-dark-muted mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
            <li>/</li>
            <li className="text-slate-700 dark:text-dark-text">Tags</li>
          </ol>
        </nav>
        <header className="mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">All Tags</h1>
          <p className="text-lg text-slate-600 dark:text-dark-muted max-w-2xl">{tags.length} topics covering AI tools, reviews, comparisons, and tutorials.</p>
        </header>
        <div className="grid md:grid-cols-3 gap-6">
          {columns.map((col, ci) => (
            <div key={ci} className="space-y-2">
              {col.map((t) => (
                <Link key={t.name} href={`/tag/${slugify(t.name)}`} className="flex items-center justify-between px-4 py-2 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-lg hover:border-blue-400 dark:hover:border-blue-500 transition group">
                  <span className="text-slate-700 dark:text-dark-text group-hover:text-blue-600 font-medium">#{t.name}</span>
                  <span className="text-xs text-slate-400 dark:text-dark-muted bg-slate-100 dark:bg-dark-bg px-2 py-0.5 rounded-full">{t.count}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

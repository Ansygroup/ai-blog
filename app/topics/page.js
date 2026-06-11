import Link from 'next/link';
import { topics } from '../../lib/topics';
import { siteConfig } from '../../lib/config';
import { breadcrumbJsonLd } from '../../lib/schema';

export const dynamic = 'force-static';

export const metadata = {
  title: 'AI Topics — Guides, Comparisons & Tutorials 2026',
  description: 'Explore curated topic clusters: AI content creation, image generation, coding, marketing, voice, video, and more.',
  alternates: { canonical: `${siteConfig.url}/topics` },
  openGraph: {
    title: "AI Topics — AI Pulse Daily",
    description: "Explore AI topics, categories, and trends. In-depth guides and resources.",
    url: siteConfig.url + '/topics',
    siteName: siteConfig.name,
    type: 'website',
  },
};

export default function TopicsIndex() {
  return (
    <>
      <script id="ld-topics-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: siteConfig.url },
        { name: 'Topics', url: `${siteConfig.url}/topics` },
      ])) }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-sm text-slate-500 dark:text-dark-muted mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
            <li>/</li>
            <li className="text-slate-700 dark:text-dark-text">Topics</li>
          </ol>
        </nav>

        <header className="mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">AI Topics</h1>
          <p className="text-lg text-slate-600 dark:text-dark-muted max-w-2xl">Curated guides and comparisons across every major AI category. Pick a topic to explore.</p>
        </header>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {topics.map((t) => (
            <Link key={t.slug} href={`/topics/${t.slug}`} className="group bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-dark-border p-6 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition">
              <h2 className="text-xl font-bold mb-2 group-hover:text-blue-600 transition">{t.title}</h2>
              <p className="text-slate-600 dark:text-dark-muted text-sm">{t.tagline}</p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

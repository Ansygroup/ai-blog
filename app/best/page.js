import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getAllPosts } from '../../lib/posts';
import PostCard from '../../components/PostCard';
import { siteConfig } from '../../lib/config';
import { breadcrumbJsonLd } from '../../lib/schema';
import AdSlot from '../../components/AdSlot';
import PaginationNav from '../../components/PaginationNav';

const POSTS_PER_PAGE = 24;

export const metadata = {
  title: 'Best AI Tools 2026 — Curated Rankings & Reviews',
  description: 'Curated "best of" lists ranking the top AI tools in every category. Best AI writing tools, image generators, code assistants, and more.',
  alternates: { canonical: `${siteConfig.url}/best` },
  openGraph: {
    title: 'Best AI Tools 2026 — Curated Rankings & Reviews',
    description: 'Curated "best of" lists ranking the top AI tools in every category.',
    url: `${siteConfig.url}/best`,
    siteName: siteConfig.name,
    type: 'website',
  },
};

export default function BestPage() {
  const allPosts = getAllPosts().filter((p) => p.category === 'Best Of');
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  const posts = allPosts.slice(0, POSTS_PER_PAGE);
  return (
    <>
      <script id="ld-best-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: siteConfig.url },
        { name: 'Best AI Tools 2026', url: `${siteConfig.url}/best` },
      ])) }} />
      <script id="ld-best-collection" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Best AI Tools 2026',
        description: 'Curated rankings of the best AI tools in every category.',
        url: `${siteConfig.url}/best`,
      }) }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-sm text-slate-500 dark:text-dark-muted mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
            <li><ChevronRight className="w-3.5 h-3.5 text-slate-300" aria-hidden="true" /></li>
            <li className="text-slate-700 dark:text-dark-text">Best AI Tools 2026</li>
          </ol>
        </nav>
        <header className="mb-10">
          <p className="text-sm text-slate-500 dark:text-dark-muted uppercase tracking-wider mb-2">Rankings</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">Best AI Tools 2026</h1>
          <p className="text-lg text-slate-600 dark:text-dark-muted max-w-2xl">Our curated rankings of the best AI tools in every category. Updated quarterly with fresh testing data.</p>
        </header>
        <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((p, i) => <PostCard key={p.slug} post={p} index={i} />)}
        </div>
        <PaginationNav currentPage={1} totalPages={totalPages} basePath="/best" />
      </div>
    </>
  );
}

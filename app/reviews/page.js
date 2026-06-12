import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getAllPosts } from '../../lib/posts';
import PostCard from '../../components/PostCard';
import { siteConfig } from '../../lib/config';
import { breadcrumbJsonLd, listJsonLd } from '../../lib/schema';
import AdSlot from '../../components/AdSlot';
import PaginationNav from '../../components/PaginationNav';

const POSTS_PER_PAGE = 24;

export const metadata = {
  title: 'AI Tool Reviews — Honest, Hands-On Testing',
  description: 'Honest, hands-on reviews of the best AI tools. We test every feature so you know exactly what you are getting before you buy.',
  alternates: { canonical: `${siteConfig.url}/reviews` },
  openGraph: {
    title: 'AI Tool Reviews — Honest, Hands-On Testing',
    description: 'Honest, hands-on reviews of the best AI tools.',
    url: `${siteConfig.url}/reviews`,
    siteName: siteConfig.name,
    type: 'website',
  },
};

export default function ReviewsPage() {
  const allPosts = getAllPosts().filter((p) => p.category === 'Reviews');
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  const posts = allPosts.slice(0, POSTS_PER_PAGE);
  return (
    <>
      <script id="ld-reviews-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: siteConfig.url },
        { name: 'Reviews', url: `${siteConfig.url}/reviews` },
      ])) }} />
      <script id="ld-reviews-list" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listJsonLd(
        posts.map(p => ({ url: `${siteConfig.url}/${p.category === 'AI News' ? 'news' : 'posts'}/${p.slug}`, name: p.title }))
      )) }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-sm text-slate-500 dark:text-dark-muted mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
            <li><ChevronRight className="w-3.5 h-3.5 text-slate-300" aria-hidden="true" /></li>
            <li className="text-slate-700 dark:text-dark-text">Reviews</li>
          </ol>
        </nav>
        <header className="mb-10">
          <p className="text-sm text-slate-500 dark:text-dark-muted uppercase tracking-wider mb-2">Reviews</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">AI Tool Reviews</h1>
          <p className="text-lg text-slate-600 dark:text-dark-muted max-w-2xl">Honest, hands-on reviews of the best AI tools. We test every feature so you know exactly what you are getting before you buy.</p>
        </header>
        <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((p, i) => <PostCard key={p.slug} post={p} index={i} />)}
        </div>
        <PaginationNav currentPage={1} totalPages={totalPages} basePath="/reviews" />
      </div>
    </>
  );
}

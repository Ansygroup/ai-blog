import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getAllPosts } from '../../../../lib/posts';
import PostCard from '../../../../components/PostCard';
import { siteConfig } from '../../../../lib/config';
import { breadcrumbJsonLd } from '../../../../lib/schema';
import AdSlot from '../../../../components/AdSlot';
import PaginationNav from '../../../../components/PaginationNav';

export const dynamic = 'force-static';

const POSTS_PER_PAGE = 24;

export function generateStaticParams() {
  const allPosts = getAllPosts().filter((p) => p.category === 'Comparisons');
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  return Array.from({ length: totalPages - 1 }, (_, i) => ({ num: String(i + 2) }));
}

export function generateMetadata({ params }) {
  const num = Number(params.num);
  const allPosts = getAllPosts().filter((p) => p.category === 'Comparisons');
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  return {
    title: `AI Tool Comparisons — Page ${num} | Side-by-Side Reviews`,
    description: `Side-by-side AI tool comparisons — page ${num} of ${totalPages}.`,
    alternates: { canonical: `${siteConfig.url}/comparisons/page/${num}` },
  };
}

export default function ComparisonsPageNum({ params }) {
  const num = Number(params.num);
  if (!Number.isInteger(num) || num < 2) notFound();

  const allPosts = getAllPosts().filter((p) => p.category === 'Comparisons');
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  if (num > totalPages) notFound();

  const start = (num - 1) * POSTS_PER_PAGE;
  const posts = allPosts.slice(start, start + POSTS_PER_PAGE);

  return (
    <>
      <script id="ld-compare-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: siteConfig.url },
        { name: 'Comparisons', url: `${siteConfig.url}/comparisons` },
        { name: `Page ${num}`, url: `${siteConfig.url}/comparisons/page/${num}` },
      ])) }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-sm text-slate-500 dark:text-dark-muted mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
            <li><ChevronRight className="w-3.5 h-3.5 text-slate-300" /></li>
            <li><Link href="/comparisons" className="hover:text-blue-600">Comparisons</Link></li>
            <li><ChevronRight className="w-3.5 h-3.5 text-slate-300" /></li>
            <li className="text-slate-700 dark:text-dark-text">Page {num}</li>
          </ol>
        </nav>
        <header className="mb-10">
          <p className="text-sm text-slate-500 dark:text-dark-muted uppercase tracking-wider mb-2">Compare</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">AI Tool Comparisons — Page {num}</h1>
          <p className="text-lg text-slate-600 dark:text-dark-muted max-w-2xl">{allPosts.length} side-by-side comparisons.</p>
        </header>
        <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((p, i) => <PostCard key={p.slug} post={p} index={i} />)}
        </div>
        <PaginationNav currentPage={num} totalPages={totalPages} basePath="/comparisons" />
      </div>
    </>
  );
}
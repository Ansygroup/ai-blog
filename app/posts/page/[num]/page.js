import Link from 'next/link';
import { getAllPosts } from '../../../../lib/posts';
import PostCard from '../../../../components/PostCard';
import { siteConfig } from '../../../../lib/config';
import { breadcrumbJsonLd } from '../../../../lib/schema';
import { notFound } from 'next/navigation';

const POSTS_PER_PAGE = 24;

export function generateStaticParams() {
  const allPosts = getAllPosts();
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  return Array.from({ length: totalPages - 1 }, (_, i) => ({ num: String(i + 2) }));
}

export function generateMetadata({ params }) {
  const num = Number(params.num);
  const allPosts = getAllPosts();
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  const title = `All Articles — Page ${num}`;
  return {
    title,
    description: `Browse AI tool reviews, comparisons, and tutorials — page ${num} of ${totalPages}.`,
    alternates: { canonical: `${siteConfig.url}/posts/page/${num}` },
    openGraph: { title: `${title} | ${siteConfig.name}`, url: `${siteConfig.url}/posts/page/${num}`, siteName: siteConfig.name },
  };
}

export default function PostsPageNum({ params }) {
  const num = Number(params.num);
  if (!Number.isInteger(num) || num < 2) notFound();

  const allPosts = getAllPosts();
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  if (num > totalPages) notFound();

  const start = (num - 1) * POSTS_PER_PAGE;
  const posts = allPosts.slice(start, start + POSTS_PER_PAGE);

  return (
    <>
      <script id="ld-posts-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: siteConfig.url },
        { name: 'All Articles', url: `${siteConfig.url}/posts` },
        { name: `Page ${num}`, url: `${siteConfig.url}/posts/page/${num}` },
      ])) }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-sm text-slate-500 dark:text-dark-muted mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
            <li>/</li>
            <li><Link href="/posts" className="hover:text-blue-600">All Articles</Link></li>
            <li>/</li>
            <li className="text-slate-700 dark:text-dark-text">Page {num}</li>
          </ol>
        </nav>
        <header className="mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">All Articles — Page {num}</h1>
          <p className="text-lg text-slate-600 dark:text-dark-muted max-w-2xl">
            {allPosts.length} in-depth AI tool reviews, comparisons, tutorials, and best-of lists.
          </p>
        </header>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((p) => <PostCard key={p.slug} post={p} />)}
        </div>
        <div className="flex justify-center items-center gap-4 mt-12">
          <Link
            href={num > 2 ? `/posts/page/${num - 1}` : '/posts'}
            className="inline-flex items-center gap-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 font-semibold px-5 py-2.5 rounded-lg transition text-sm"
          >
            ← Previous page
          </Link>
          <span className="text-slate-500 text-sm">Page {num} of {totalPages}</span>
          {num < totalPages && (
            <Link
              href={`/posts/page/${num + 1}`}
              className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-2.5 rounded-lg transition text-sm"
            >
              Next page →
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

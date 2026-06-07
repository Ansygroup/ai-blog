import Link from 'next/link';
import { getAllPosts } from '../../lib/posts';
import PostCard from '../../components/PostCard';
import { siteConfig } from '../../lib/config';
import { breadcrumbJsonLd } from '../../lib/schema';

const POSTS_PER_PAGE = 24;

export const metadata = {
  title: 'All Articles — AI Tool Reviews, Comparisons & Tutorials',
  description: 'Browse all AI tool reviews, comparisons, tutorials, and best-of lists. 144+ in-depth articles updated for 2026.',
  alternates: { canonical: `${siteConfig.url}/posts` },
  openGraph: {
    title: 'All Articles — AI Pulse Daily',
    description: 'Browse all AI tool reviews, comparisons, tutorials, and best-of lists.',
    url: `${siteConfig.url}/posts`,
    siteName: siteConfig.name,
    type: 'website',
  },
};

export default function PostsPage() {
  const allPosts = getAllPosts().filter((p) => p.category !== 'AI News');
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  const posts = allPosts.slice(0, POSTS_PER_PAGE);

  return (
    <>
      <script id="ld-posts-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: siteConfig.url },
        { name: 'All Articles', url: `${siteConfig.url}/posts` },
      ])) }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-sm text-slate-500 dark:text-dark-muted mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
            <li>/</li>
            <li className="text-slate-700 dark:text-dark-text">All Articles</li>
          </ol>
        </nav>
        <header className="mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">All Articles</h1>
          <p className="text-lg text-slate-600 dark:text-dark-muted max-w-2xl">
            {allPosts.length} in-depth AI tool reviews, comparisons, tutorials, and best-of lists. Updated daily.
          </p>
        </header>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((p) => <PostCard key={p.slug} post={p} />)}
        </div>
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-12">
            <span className="text-slate-500 text-sm">Page 1 of {totalPages}</span>
            <Link
              href={`/posts/page/2`}
              className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-2.5 rounded-lg transition text-sm"
            >
              Next page →
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

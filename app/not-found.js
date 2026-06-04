import Link from 'next/link';
import { getAllPosts } from '../lib/posts';

export const metadata = { title: '404 — Page Not Found' };

export default function NotFound() {
  const recent = getAllPosts().slice(0, 4);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-lg">
        <h1 className="text-8xl font-extrabold text-slate-200 dark:text-slate-700 mb-4">404</h1>
        <h2 className="text-2xl font-bold mb-3">Page Not Found</h2>
        <p className="text-slate-600 dark:text-dark-muted mb-8">
          This page doesn't exist or has been moved. Try searching or browse our latest AI tool reviews.
        </p>
        <div className="flex flex-wrap gap-3 justify-center mb-10">
          <Link href="/" className="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg transition">Home</Link>
          <Link href="/reviews" className="bg-white dark:bg-dark-card border border-slate-300 dark:border-dark-border hover:border-blue-500 dark:hover:border-blue-400 font-semibold px-5 py-2.5 rounded-lg transition">All Reviews</Link>
          <Link href="/search" className="bg-white dark:bg-dark-card border border-slate-300 dark:border-dark-border hover:border-blue-500 dark:hover:border-blue-400 font-semibold px-5 py-2.5 rounded-lg transition">Search</Link>
        </div>

        {recent.length > 0 && (
          <>
            <h3 className="text-sm font-semibold text-slate-500 dark:text-dark-muted uppercase tracking-wide mb-4">Latest Articles</h3>
            <div className="space-y-2 text-left">
              {recent.map(p => (
                <Link key={p.slug} href={`/posts/${p.slug}`}
                  className="block text-sm text-blue-600 dark:text-blue-400 hover:underline truncate"
                >
                  {p.title}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

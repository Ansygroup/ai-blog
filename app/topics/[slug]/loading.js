import { PostCardSkeleton } from '../../../components/ui/Skeleton';
import { ShoppingCart } from 'lucide-react';

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <nav className="text-sm text-slate-500 dark:text-dark-muted mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 flex-wrap">
          <li><a href="/" className="hover:text-blue-600">Home</a></li>
          <li>/</li>
          <li><a href="/topics" className="hover:text-blue-600">All Topics</a></li>
          <li>/</li>
          <li><div className="h-5 w-32 bg-slate-200 dark:bg-dark-card rounded animate-pulse inline-block" /></li>
        </ol>
      </nav>
      <div className="mb-10">
        <div className="h-4 w-16 bg-slate-200 dark:bg-dark-card rounded animate-pulse mb-2" />
        <div className="h-12 w-80 bg-slate-200 dark:bg-dark-card rounded-lg animate-pulse mb-3" />
        <div className="h-5 w-96 bg-slate-200 dark:bg-dark-card rounded animate-pulse" />
      </div>
      <div className="space-y-4 mb-12">
        <PostCardSkeleton count={3} />
      </div>
      <section className="mb-12 pt-6 border-t border-slate-200 dark:border-dark-border">
        <div className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /><h2 className="text-2xl font-bold mb-6">Recommended Gear</h2></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-3 animate-pulse">
              <div className="aspect-square w-full bg-slate-200 dark:bg-dark-card rounded mb-2" />
              <div className="h-5 w-full bg-slate-200 dark:bg-dark-card rounded animate-pulse mb-1" />
              <div className="h-4 w-1/2 bg-slate-200 dark:bg-dark-card rounded animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
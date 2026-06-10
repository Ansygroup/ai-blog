import { PostCardSkeleton } from '../../../../components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <nav className="text-sm text-slate-500 dark:text-dark-muted mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 flex-wrap">
          <li><a href="/" className="hover:text-blue-600">Home</a></li>
          <li>/</li>
          <li><a href="/recommendations" className="hover:text-blue-600">Tech Store</a></li>
          <li>/</li>
          <li><a href="#" className="hover:text-blue-600">Category</a></li>
          <li>/</li>
          <li className="text-slate-700 dark:text-dark-text truncate max-w-[200px]"><div className="h-5 w-48 bg-slate-200 dark:bg-dark-card rounded animate-pulse inline-block" /></li>
        </ol>
      </nav>
      <div className="grid md:grid-cols-2 gap-8 mb-10">
        <div>
          <div className="aspect-square w-full bg-slate-200 dark:bg-dark-card rounded-xl animate-pulse" />
        </div>
        <div>
          <div className="h-4 w-32 bg-slate-200 dark:bg-dark-card rounded animate-pulse mb-1" />
          <div className="h-8 w-64 bg-slate-200 dark:bg-dark-card rounded animate-pulse mb-3" />
          <div className="h-12 w-full bg-slate-200 dark:bg-dark-card rounded animate-pulse mb-4" />
          <div className="h-4 w-full bg-slate-200 dark:bg-dark-card rounded animate-pulse mb-2" />
          <div className="h-4 w-3/4 bg-slate-200 dark:bg-dark-card rounded animate-pulse mb-6" />
          <div className="h-12 w-full bg-amber-400 rounded-lg animate-pulse" />
        </div>
      </div>
      <PostCardSkeleton />
    </div>
  );
}
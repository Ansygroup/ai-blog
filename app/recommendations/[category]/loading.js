import { PostCardSkeleton } from '../../../components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <nav className="text-sm text-slate-500 dark:text-dark-muted mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 flex-wrap">
          <li><a href="/" className="hover:text-blue-600">Home</a></li>
          <li>/</li>
          <li><a href="/recommendations" className="hover:text-blue-600">Tech Store</a></li>
          <li>/</li>
          <li><div className="h-5 w-32 bg-slate-200 dark:bg-dark-card rounded animate-pulse inline-block" /></li>
        </ol>
      </nav>
      <div className="mb-8">
        <div className="h-4 w-16 bg-slate-200 dark:bg-dark-card rounded animate-pulse mb-2" />
        <div className="h-10 w-80 bg-slate-200 dark:bg-dark-card rounded-lg animate-pulse mb-3" />
        <div className="h-5 w-96 bg-slate-200 dark:bg-dark-card rounded animate-pulse" />
      </div>
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-dark-card dark:to-dark-bg border border-blue-200 dark:border-dark-border rounded-xl p-6 mb-8 animate-pulse">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="h-4 w-64 bg-slate-200 dark:bg-dark-card rounded animate-pulse" />
            <div className="h-4 w-80 bg-slate-200 dark:bg-dark-card rounded animate-pulse" />
            <div className="h-4 w-72 bg-slate-200 dark:bg-dark-card rounded animate-pulse" />
            <div className="h-4 w-64 bg-slate-200 dark:bg-dark-card rounded animate-pulse" />
          </div>
          <div className="space-y-3">
            <div className="h-4 w-64 bg-slate-200 dark:bg-dark-card rounded animate-pulse" />
            <div className="h-4 w-64 bg-slate-200 dark:bg-dark-card rounded animate-pulse" />
            <div className="h-4 w-64 bg-slate-200 dark:bg-dark-card rounded animate-pulse" />
            <div className="h-4 w-64 bg-slate-200 dark:bg-dark-card rounded animate-pulse" />
          </div>
        </div>
      </div>
      <PostCardSkeleton count={6} />
    </div>
  );
}
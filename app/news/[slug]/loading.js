import { PostCardSkeleton } from '../../../components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="h-10 w-64 bg-slate-200 dark:bg-dark-card rounded-lg animate-pulse mb-3" />
        <div className="h-5 w-96 bg-slate-200 dark:bg-dark-card rounded animate-pulse" />
      </div>
      <PostCardSkeleton />
    </div>
  );
}
export default function Skeleton({ className = '', variant = 'rectangular' }) {
  const base = 'animate-pulse bg-slate-200 dark:bg-dark-card rounded';
  const variants = {
    rectangular: 'w-full h-48',
    text: 'h-4 w-3/4',
    title: 'h-6 w-1/2',
    circle: 'w-12 h-12 rounded-full',
    badge: 'h-5 w-16 rounded-full',
  };
  return <div className={`${base} ${variants[variant] || variants.rectangular} ${className}`} aria-hidden="true" />;
}

export function PostCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:bg-dark-card dark:border-dark-border animate-pulse">
      <div className="aspect-video bg-slate-200 dark:bg-dark-border" />
      <div className="p-5 space-y-3">
        <div className="h-5 w-16 bg-slate-200 dark:bg-dark-border rounded-full" />
        <div className="h-5 w-full bg-slate-200 dark:bg-dark-border rounded" />
        <div className="h-5 w-3/4 bg-slate-200 dark:bg-dark-border rounded" />
        <div className="h-4 w-1/2 bg-slate-200 dark:bg-dark-border rounded" />
      </div>
    </div>
  );
}

export function PostGridSkeleton({ count = 6 }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }, (_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}

import { Skeleton } from '@/components/ui/Skeleton';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ icon: Icon, label, value, sub, trend, loading, error }) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-dark-card dark:border-dark-border">
        <div className="flex items-center gap-3 mb-3">
          <Skeleton variant="rectangular" className="w-10 h-10 !rounded-lg" />
          <Skeleton variant="text" className="w-20" />
        </div>
        <Skeleton variant="title" className="w-16 h-8" />
        <Skeleton variant="text" className="w-24 mt-2" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <Icon className="w-5 h-5 text-red-500" />
          </div>
          <span className="text-sm font-medium text-slate-500 dark:text-dark-muted">{label}</span>
        </div>
        <p className="text-xs text-red-500">Failed to load</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-dark-card dark:border-dark-border hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        </div>
        <span className="text-sm font-medium text-slate-500 dark:text-dark-muted">{label}</span>
      </div>
      <div className="text-2xl font-bold font-heading text-slate-900 dark:text-dark-text">
        {value ?? '—'}
      </div>
      {sub && (
        <div className="flex items-center gap-1 mt-1">
          {trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-green-500" />}
          {trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
          <span className="text-xs text-slate-500 dark:text-dark-muted">{sub}</span>
        </div>
      )}
    </div>
  );
}

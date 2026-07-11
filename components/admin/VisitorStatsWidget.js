'use client';

import { useEffect, useState } from 'react';
import { Eye, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Link from 'next/link';

export default function VisitorStatsWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const res = await fetch('/admin/api/visits?days=7');
        const d = await res.json();
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (loading) {
    return (
      <a href="/admin/visits" className="rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-3 hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition text-center block">
        <Eye className="w-4 h-4 mx-auto mb-1 text-slate-300" />
        <div className="text-lg font-bold text-slate-300 dark:text-dark-muted leading-tight">—</div>
        <div className="text-[10px] text-slate-400 dark:text-dark-muted leading-tight mt-0.5">Visitors</div>
      </a>
    );
  }

  const today = data?.today || 0;
  const week = data?.thisWeek || 0;
  const yesterday = data?.daily?.[data.daily.length - 2]?.count ?? 0;
  const trend = today === yesterday ? 'flat' : today > yesterday ? 'up' : 'down';
  const trendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-slate-400';
  const TrendIcon = trendIcon;

  return (
    <Link
      href="/admin/visits"
      className="rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-3 hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition text-center block group"
      title={`${today} today · ${week} this week`}
    >
      <div className="relative">
        <Eye className="w-4 h-4 mx-auto mb-1 text-cyan-500 group-hover:text-cyan-600" />
        {trend !== 'flat' && (
          <TrendIcon className={`w-2.5 h-2.5 absolute top-0 right-1 ${trendColor}`} />
        )}
      </div>
      <div className="text-lg font-bold text-slate-900 dark:text-dark-text leading-tight tabular-nums">{today.toLocaleString()}</div>
      <div className="text-[10px] text-slate-400 dark:text-dark-muted leading-tight mt-0.5">Visitors Today</div>
    </Link>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { BarChart3, FileText, BookOpen, TrendingUp, CheckCircle2, AlertCircle, Flame, Target, Hash, Activity } from 'lucide-react';
import { SkeletonCard } from '@/components/admin/Skeleton';

export default function StatsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/admin/api/stats')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6"><BarChart3 className="w-5 h-5 text-slate-300" /><div><div className="h-6 w-32 bg-slate-200 dark:bg-dark-border rounded animate-pulse" /><div className="h-4 w-24 bg-slate-100 dark:bg-dark-border rounded animate-pulse mt-1" /></div></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5"><div className="h-3 w-32 bg-slate-200 dark:bg-dark-border rounded animate-pulse mb-3" /><div className="flex gap-0.5">{Array.from({length: 52}).map((_, w) => <div key={w} className="flex flex-col gap-0.5">{Array.from({length: 7}).map((_, d) => <div key={d} className="w-2.5 h-2.5 rounded-sm bg-slate-100 dark:bg-dark-border animate-pulse" />)}</div>)}</div></div>
      </div>
    );
  }

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-5 h-5 text-brand-600" />
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Blog Statistics</h1>
          <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">All metrics in one place</p>
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1"><FileText className="w-3 h-3" /> Total</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-dark-text">{data?.totalPosts || 0}</div>
          <div className="text-xs text-slate-400">{data?.drafts || 0} drafts · {data?.published || 0} published</div>
        </div>
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1"><BookOpen className="w-3 h-3" /> Words</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-dark-text">{(data?.totalWords || 0).toLocaleString()}</div>
          <div className="text-xs text-slate-400">{data?.avgWords || 0} avg/post</div>
        </div>
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1"><TrendingUp className="w-3 h-3" /> Avg SEO</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-dark-text">{data?.avgSeo || 0}/100</div>
          <div className="text-xs text-slate-400">across {data?.published || 0} posts</div>
        </div>
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1"><Flame className="w-3 h-3" /> Streak</div>
          <div className="text-2xl font-bold text-orange-500">{data?.currentStreak || 0}d</div>
          <div className="text-xs text-slate-400">Best: {data?.longestStreak || 0}d</div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> With Excerpt</div>
          <div className="text-lg font-bold text-green-600">{data?.withExcerpt || 0}</div>
        </div>
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1"><AlertCircle className="w-3 h-3 text-amber-500" /> Missing Excerpt</div>
          <div className="text-lg font-bold text-amber-600">{data?.withoutExcerpt || 0}</div>
        </div>
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1"><Activity className="w-3 h-3 text-purple-500" /> Categories</div>
          <div className="text-lg font-bold text-purple-600">{data?.topCategories?.length || 0}</div>
        </div>
      </div>

      {/* Publishing Heatmap (last 365 days) */}
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-brand-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text">Publishing Heatmap</h2>
          <span className="text-xs text-slate-400 ml-auto">Last 365 days</span>
        </div>
        <div className="flex gap-0.5">
          {Array.from({ length: 52 }, (_, w) => (
            <div key={w} className="flex flex-col gap-0.5">
              {Array.from({ length: 7 }, (_, d) => {
                const idx = w * 7 + d;
                const day = data?.heatmap?.[idx];
                if (!day) return <div key={d} className="w-2.5 h-2.5 rounded-sm bg-transparent" />;
                const lvl = day.count === 0 ? 0 : day.count === 1 ? 1 : day.count <= 3 ? 2 : 3;
                const colors = ['bg-slate-100 dark:bg-dark-border', 'bg-green-200 dark:bg-green-900/30', 'bg-green-400 dark:bg-green-700/50', 'bg-green-600 dark:bg-green-500/70'];
                return <div key={d} className={`w-2.5 h-2.5 rounded-sm ${colors[lvl]}`} title={`${day.date}: ${day.count} posts`} />;
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1 justify-end mt-2 text-[10px] text-slate-400">
          <span>Less</span>
          <div className="w-2.5 h-2.5 rounded-sm bg-slate-100 dark:bg-dark-border" />
          <div className="w-2.5 h-2.5 rounded-sm bg-green-200 dark:bg-green-900/30" />
          <div className="w-2.5 h-2.5 rounded-sm bg-green-400 dark:bg-green-700/50" />
          <div className="w-2.5 h-2.5 rounded-sm bg-green-600 dark:bg-green-500/70" />
          <span>More</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Trend */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text mb-3">Monthly Publishing Trend</h2>
          {data?.monthlyTrend?.map(([m, c]) => {
            const max = Math.max(...data.monthlyTrend.map(([, v]) => v));
            const pct = (c / max) * 100;
            return (
              <div key={m} className="flex items-center gap-2 mb-1">
                <span className="text-[10px] text-slate-400 w-16 shrink-0 font-mono">{m}</span>
                <div className="flex-1 h-4 bg-slate-100 dark:bg-dark-border rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] text-slate-500 w-6 text-right font-mono">{c}</span>
              </div>
            );
          })}
        </div>

        {/* Top Categories */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text mb-3">Top Categories</h2>
          {data?.topCategories?.map(([cat, count]) => {
            const max = data.topCategories[0][1];
            const pct = (count / max) * 100;
            return (
              <div key={cat} className="flex items-center gap-2 mb-1">
                <span className="text-[10px] text-slate-400 w-16 shrink-0 font-mono">{count}x</span>
                <div className="flex-1 h-4 bg-slate-100 dark:bg-dark-border rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] text-slate-600 dark:text-dark-muted w-20 text-right truncate">{cat}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

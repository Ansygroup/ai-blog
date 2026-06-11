'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, BookOpen, Link2, Hash, FileText, CalendarDays } from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color || 'text-slate-500'}`} />
        <span className="text-xs font-medium text-slate-500 dark:text-dark-muted">{label}</span>
      </div>
      <div className="text-2xl font-bold font-heading text-slate-900 dark:text-dark-text">{value}</div>
      {sub && <div className="text-xs text-slate-400 dark:text-dark-muted mt-1">{sub}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/admin/api/stats').then(r => r.json()),
      fetch('/admin/api/content-gaps').then(r => r.json()),
    ]).then(([stats, gaps]) => {
      setData({ stats, gaps });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-8 text-center text-slate-500">Loading analytics...</div>;
  if (!data) return <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-8 text-center text-slate-500">Failed to load.</div>;

  const { stats, gaps } = data;

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Analytics</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">Site-wide content metrics and trends</p>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={FileText} label="Published" value={stats.posts.published} sub={`${stats.posts.total} total (incl. drafts)`} color="text-blue-500" />
        <StatCard icon={BookOpen} label="Total Words" value={(stats.words.total / 1000).toFixed(1) + 'k'} sub={`Avg ${stats.words.avg}/post`} color="text-indigo-500" />
        <StatCard icon={Hash} label="SEO Score" value={stats.seo.avgScore} sub={`${stats.seo.needsImprovement} below 70`} color={stats.seo.avgScore >= 70 ? 'text-green-500' : 'text-amber-500'} />
        <StatCard icon={Link2} label="Internal Links" value={stats.links.total} sub={`Avg ${stats.links.avgPerPost}/post`} color="text-purple-500" />
      </div>

      {/* Publishing activity */}
      <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-medium text-slate-700 dark:text-dark-muted">Publishing Activity</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Today', value: stats.posts.today },
            { label: 'This Week', value: stats.posts.thisWeek },
            { label: 'This Month', value: stats.posts.thisMonth },
          ].map(item => (
            <div key={item.label} className="bg-slate-50 dark:bg-dark-border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold font-heading text-slate-900 dark:text-dark-text">{item.value}</div>
              <div className="text-xs text-slate-500 mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Category distribution mini */}
      <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-medium text-slate-700 dark:text-dark-muted">Content Distribution</h2>
        </div>
        <div className="space-y-2">
          {gaps.categories.slice(0, 8).map((c, i) => {
            const max = gaps.categories[0].count;
            const pct = Math.round(c.count / max * 100);
            return (
              <div key={c.name} className="flex items-center gap-2">
                <span className="w-24 text-xs font-medium text-slate-700 dark:text-dark-text shrink-0 truncate">{c.name}</span>
                <div className="flex-1 bg-slate-100 dark:bg-dark-border rounded-full h-4 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-8 text-xs text-right text-slate-500 shrink-0">{c.count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Queue + SEO Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-6">
          <h2 className="text-xs font-medium text-slate-500 dark:text-dark-muted mb-3 uppercase tracking-wider">Queue Status</h2>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold font-heading text-slate-900 dark:text-dark-text">{stats.queue.total}</div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stats.queue.status === 'full' ? 'bg-green-100 text-green-700' : stats.queue.status === 'healthy' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
              {stats.queue.status}
            </span>
          </div>
          <div className="mt-2 w-full bg-slate-100 dark:bg-dark-border rounded-full h-2">
            <div className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.min((stats.queue.total / 30) * 100, 100)}%` }} />
          </div>
          <p className="text-xs text-slate-400 mt-2">Keywords in queue (target: 30+)</p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-6">
          <h2 className="text-xs font-medium text-slate-500 dark:text-dark-muted mb-3 uppercase tracking-wider">SEO Health</h2>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold font-heading text-slate-900 dark:text-dark-text">{stats.seo.scored}</div>
            <span className="text-xs text-slate-500">scored posts</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 bg-slate-100 dark:bg-dark-border rounded-full h-2">
              <div className="h-2 rounded-full bg-green-500" style={{ width: `${Math.min(((stats.seo.scored - stats.seo.needsImprovement) / stats.seo.scored) * 100, 100)}%` }} />
            </div>
            <span className="text-xs text-slate-500">{stats.seo.needsImprovement} need work</span>
          </div>
        </div>
      </div>

      {/* Tag health mini */}
      <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-6">
        <h2 className="text-xs font-medium text-slate-500 dark:text-dark-muted mb-3 uppercase tracking-wider">Tag Overview</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-slate-50 dark:bg-dark-border rounded-lg">
            <div className="text-2xl font-bold font-heading text-slate-900 dark:text-dark-text">{gaps.tagNormalization.totalUnique}</div>
            <div className="text-xs text-slate-500">Unique Tags</div>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-2xl font-bold font-heading text-red-600">{gaps.tagNormalization.singleUse}</div>
            <div className="text-xs text-slate-500">Used Only Once</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {gaps.tags.slice(0, 10).map(t => (
            <span key={t.name} className="text-xs bg-slate-100 dark:bg-dark-border text-slate-600 dark:text-dark-muted px-2 py-0.5 rounded">#{t.name} ({t.count})</span>
          ))}
        </div>
      </div>
    </div>
  );
}

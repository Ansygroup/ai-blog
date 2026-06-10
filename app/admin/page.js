'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import StatCard from '@/components/admin/stat-card';
import { FileText, ListTodo, Search, Calendar, BookOpen, Link2, TrendingUp, AlertTriangle } from 'lucide-react';

export default function AdminOverviewPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/admin/api/stats')
      .then((r) => r.json())
      .then((d) => { setStats(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">
          Overview
        </h1>
        <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">
          Welcome back, {session?.user?.name || 'Admin'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          label="Total Posts"
          value={stats?.posts?.total ?? '—'}
          sub={stats?.posts?.today ? `+${stats.posts.today} today` : undefined}
          trend={stats?.posts?.today > 0 ? 'up' : undefined}
          loading={loading}
          error={error}
        />
        <StatCard
          icon={Calendar}
          label="Posts (7d)"
          value={stats?.posts?.thisWeek ?? '—'}
          sub={stats?.posts?.thisMonth ? `${stats.posts.thisMonth} this month` : undefined}
          loading={loading}
          error={error}
        />
        <StatCard
          icon={ListTodo}
          label="Queue Items"
          value={stats?.queue?.total ?? '—'}
          sub={stats?.queue?.status === 'low' ? '⚠️ Low — refill needed' : stats?.queue?.status === 'full' ? '✅ Full' : 'Healthy'}
          loading={loading}
          error={error}
        />
        <StatCard
          icon={Search}
          label="Avg SEO Score"
          value={stats?.seo?.avgScore ?? '—'}
          sub={stats?.seo?.needsImprovement ? `${stats.seo.needsImprovement} need work` : undefined}
          trend={stats?.seo?.avgScore >= 70 ? 'up' : 'down'}
          loading={loading}
          error={error}
        />
        <StatCard
          icon={BookOpen}
          label="Total Words"
          value={stats?.words?.total ? (stats.words.total / 1000).toFixed(0) + 'k' : '—'}
          sub={stats?.words?.avg ? `~${stats.words.avg} per post` : undefined}
          loading={loading}
          error={error}
        />
        <StatCard
          icon={Link2}
          label="Internal Links"
          value={stats?.links?.total ?? '—'}
          sub={stats?.links?.avgPerPost ? `${stats.links.avgPerPost} avg per post` : undefined}
          loading={loading}
          error={error}
        />
        <StatCard
          icon={TrendingUp}
          label="Published"
          value={stats?.posts?.published ?? '—'}
          sub={stats?.posts?.total ? `${((stats.posts.published / stats.posts.total) * 100).toFixed(0)}% of total` : undefined}
          loading={loading}
          error={error}
        />
        <StatCard
          icon={AlertTriangle}
          label="SEO Needs Work"
          value={stats?.seo?.needsImprovement ?? '—'}
          sub={stats?.seo?.scored ? `Out of ${stats.seo.scored} scored` : undefined}
          trend={stats?.seo?.needsImprovement > 0 ? 'down' : 'up'}
          loading={loading}
          error={error}
        />
      </div>

      {!loading && !error && stats && (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white dark:bg-dark-card dark:border-dark-border p-6">
          <h2 className="text-lg font-heading font-bold text-slate-900 dark:text-dark-text mb-2">
            Blog at a Glance
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-slate-500 dark:text-dark-muted">Total slugs:</span>
              <span className="ml-2 font-medium text-slate-900 dark:text-dark-text">{stats.slugs?.total ?? 0}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-dark-muted">Avg words/post:</span>
              <span className="ml-2 font-medium text-slate-900 dark:text-dark-text">{stats.words?.avg?.toLocaleString() ?? 0}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-dark-muted">Queue status:</span>
              <span className="ml-2 font-medium text-slate-900 dark:text-dark-text">{stats.queue?.status ?? '?'}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-dark-muted">Scored posts:</span>
              <span className="ml-2 font-medium text-slate-900 dark:text-dark-text">{stats.seo?.scored ?? 0}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

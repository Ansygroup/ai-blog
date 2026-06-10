'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import StatCard from '@/components/admin/stat-card';
import { FileText, ListTodo, Search, Rocket } from 'lucide-react';

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
          icon={ListTodo}
          label="Queue Items"
          value={stats?.queue?.total ?? '—'}
          sub={stats?.queue?.total > 0 ? 'Pending generation' : undefined}
          loading={loading}
          error={error}
        />
        <StatCard
          icon={Search}
          label="Avg SEO Score"
          value={stats?.seo?.avgScore ?? '—'}
          sub={stats?.seo?.scored ? `Based on ${stats.seo.scored} posts` : undefined}
          loading={loading}
          error={error}
        />
        <StatCard
          icon={Rocket}
          label="Post Slugs"
          value={stats?.slugs?.total ?? '—'}
          sub={stats?.posts?.published ? `${stats.posts.published} published` : undefined}
          loading={loading}
          error={error}
        />
      </div>
    </div>
  );
}

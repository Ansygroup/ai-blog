'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ExternalLink } from 'lucide-react';

function seoColor(score) {
  if (!score || score < 40) return 'text-red-600 dark:text-red-400';
  if (score < 60) return 'text-yellow-600 dark:text-yellow-400';
  if (score < 80) return 'text-blue-600 dark:text-blue-400';
  return 'text-green-600 dark:text-green-400';
}

export default function SeoChart({ data, loading, error }) {
  const chartData = useMemo(() => {
    if (!data?.distribution) return [];
    return Object.entries(data.distribution).map(([range, count]) => ({
      range,
      count,
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white dark:bg-dark-card dark:border-dark-border p-8 text-center text-slate-500 dark:text-dark-muted">
        Loading SEO data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-dark-border p-8 text-center">
        <p className="text-sm text-slate-500 dark:text-dark-muted">Failed to load SEO data</p>
        <p className="text-xs text-slate-400 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Average Score', value: data?.avgScore ?? '—', color: seoColor(data?.avgScore) },
          { label: 'Min Score', value: data?.minScore ?? '—', color: seoColor(data?.minScore) },
          { label: 'Max Score', value: data?.maxScore ?? '—', color: seoColor(data?.maxScore) },
          { label: 'Need Improvement', value: data?.needsImprovement ?? '—', color: 'text-red-600 dark:text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white dark:bg-dark-card dark:border-dark-border p-4">
            <div className="text-xs text-slate-500 dark:text-dark-muted mb-1">{label}</div>
            <div className={`text-2xl font-bold font-heading ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white dark:bg-dark-card dark:border-dark-border p-4">
        <h3 className="text-sm font-medium text-slate-700 dark:text-dark-muted mb-4">SEO Score Distribution</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <XAxis dataKey="range" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {data?.posts?.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-dark-card dark:border-dark-border">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-dark-border">
            <h3 className="text-sm font-medium text-slate-700 dark:text-dark-muted">
              Posts Needing Improvement ({data.needsImprovement})
            </h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-dark-border">
            {data.posts.map((post) => (
              <div key={post.slug} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-dark-border/50">
                <div className="flex items-center gap-3">
                  <a
                    href={`/posts/${post.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-sm text-slate-900 dark:text-dark-text hover:text-brand-600 dark:hover:text-brand-400"
                  >
                    {post.title || post.slug}
                    <ExternalLink className="w-3 h-3 shrink-0 opacity-40" />
                  </a>
                </div>
                <span className={`text-sm font-semibold ${seoColor(post.seoScore)}`}>
                  {post.seoScore ?? '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

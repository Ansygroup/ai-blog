'use client';

import { useState, useEffect } from 'react';
import { Link2 } from 'lucide-react';

export default function AdminLinksPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/admin/api/links')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white dark:bg-dark-card dark:border-dark-border p-8 text-center text-slate-500 dark:text-dark-muted">
        Loading...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Link2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">
            Internal Links
          </h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">
          Internal linking statistics across all posts
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Links', value: data?.totalLinks ?? 0 },
          { label: 'Avg per Post', value: data?.avgPerPost ?? 0 },
          { label: 'Posts without Links', value: data?.postsWithoutLinks ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white dark:bg-dark-card dark:border-dark-border p-4">
            <div className="text-xs text-slate-500 dark:text-dark-muted mb-1">{label}</div>
            <div className="text-2xl font-bold font-heading text-slate-900 dark:text-dark-text">{value}</div>
          </div>
        ))}
      </div>

      {data?.posts?.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-dark-card dark:border-dark-border">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-dark-border">
            <h3 className="text-sm font-medium text-slate-700 dark:text-dark-muted">
              Posts With No Internal Links ({data.posts.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-dark-border">
            {data.posts.map((post) => (
              <div key={post.slug} className="px-4 py-3 text-sm text-slate-900 dark:text-dark-text hover:bg-slate-50 dark:hover:bg-dark-border/50">
                {post.title || post.slug}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

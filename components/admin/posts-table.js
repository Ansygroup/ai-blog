'use client';

import { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ExternalLink } from 'lucide-react';
import Badge from '@/components/ui/Badge';

const categoryColors = {
  'Best Of': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  Reviews: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Comparisons: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  Tutorials: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'AI News': 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
};

function seoColor(score) {
  if (!score) return 'text-slate-400';
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

export default function PostsTable({ posts, loading }) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);
  const perPage = 20;

  const filtered = useMemo(() => {
    let items = posts || [];
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((p) => p.title?.toLowerCase().includes(q) || p.slug?.includes(q));
    }
    items = [...items].sort((a, b) => {
      let va = a[sortField];
      let vb = b[sortField];
      if (sortField === 'date' || sortField === 'lastUpdated') {
        va = va || '';
        vb = vb || '';
      }
      if (sortField === 'seoScore') {
        va = va || 0;
        vb = vb || 0;
      }
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return items;
  }, [posts, search, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const pageItems = filtered.slice(page * perPage, (page + 1) * perPage);

  function toggleSort(field) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white dark:bg-dark-card dark:border-dark-border p-8 text-center text-slate-500 dark:text-dark-muted">
        Loading posts...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by title or slug..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-sm text-slate-900 dark:text-dark-text placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white dark:bg-dark-card dark:border-dark-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg">
                {[
                  { key: 'title', label: 'Title' },
                  { key: 'category', label: 'Category' },
                  { key: 'date', label: 'Date' },
                  { key: 'seoScore', label: 'SEO' },
                  { key: 'tags', label: 'Tags' },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    className="px-4 py-3 text-left font-medium text-slate-600 dark:text-dark-muted cursor-pointer hover:text-slate-900 dark:hover:text-dark-text select-none"
                    onClick={() => toggleSort(key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {label}
                      <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-dark-muted">Status</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-500 dark:text-dark-muted text-sm">
                    No posts found
                  </td>
                </tr>
              ) : pageItems.map((post) => (
                <tr key={post.slug} className="border-b border-slate-100 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-border/50">
                  <td className="px-4 py-3">
                    <a
                      href={`/posts/${post.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 text-slate-900 dark:text-dark-text font-medium hover:text-brand-600 dark:hover:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded"
                    >
                      {post.title || post.slug}
                      <ExternalLink className="w-3 h-3 shrink-0 opacity-40" />
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    {post.category && (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[post.category] || 'bg-slate-100 text-slate-700 dark:bg-dark-border dark:text-dark-muted'}`}>
                        {post.category}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-dark-muted whitespace-nowrap">
                    {post.date || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${seoColor(post.seoScore)}`}>
                      {post.seoScore ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {(post.tags || []).slice(0, 3).map((t) => (
                        <Badge key={t}>{t}</Badge>
                      ))}
                      {(post.tags || []).length > 3 && (
                        <span className="text-xs text-slate-500">+{post.tags.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {post.draft ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                        Draft
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Published
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-dark-muted">
          <span>{filtered.length} posts total</span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded border border-slate-200 dark:border-dark-border disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-dark-border cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              Prev
            </button>
            <span className="px-2 py-1">{page + 1} / {totalPages}</span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded border border-slate-200 dark:border-dark-border disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-dark-border cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

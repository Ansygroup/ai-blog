'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, FileText, AlertTriangle, CheckCircle2, Clock, Loader2, Search, ArrowUp, ExternalLink, Filter, RotateCcw, Sparkles } from 'lucide-react';
import { Skeleton, SkeletonCard } from '@/components/admin/Skeleton';

const STALE_DAYS = 180;
const WARNING_DAYS = 90;

export default function ContentRefreshPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [dispatching, setDispatching] = useState(false);

  useEffect(() => {
    fetch('/admin/api/content-refresh')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function toggle(slug) {
    setSelected(prev => ({ ...prev, [slug]: !prev[slug] }));
  }

  function toggleAll(checked) {
    const all = {};
    filteredPosts.forEach(p => { all[p.slug] = checked; });
    setSelected(all);
  }

  async function handleRefresh() {
    const slugs = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
    if (slugs.length === 0) return;
    setDispatching(true);
    try {
      await fetch('/admin/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh', inputs: { slugs: slugs.join(',') } }),
      });
    } catch {}
    setDispatching(false);
  }

  const filteredPosts = (data?.posts || [])
    .filter(p => {
      if (filter === 'stale') return p.stale;
      if (filter === 'warning') return p.daysSinceUpdate >= WARNING_DAYS && !p.stale;
      if (filter === 'fresh') return p.daysSinceUpdate < WARNING_DAYS;
      return true;
    })
    .filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 200);

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const staleSelected = Object.entries(selected).filter(([, v]) => v).filter(([k]) => data?.posts.find(p => p.slug === k)?.stale).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <div>
            <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Content Refresh</h1>
            <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">
              {data ? `${data.total} posts · ${data.stale} stale (>${STALE_DAYS}d) · ${data.needsRefresh - data.stale} aging (>${WARNING_DAYS}d)` : 'Loading...'}
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={dispatching || selectedCount === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white text-sm font-medium transition"
        >
          {dispatching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
          {dispatching ? 'Dispatching...' : `Refresh ${selectedCount > 0 ? `(${selectedCount})` : ''}`}
        </button>
      </div>

      {staleSelected > 0 && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {staleSelected} stale post{staleSelected > 1 ? 's' : ''} selected — refresh will trigger a GitHub Actions workflow
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search posts..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-dark-text text-sm focus:ring-2 focus:ring-brand-500 outline-none"
          />
        </div>
        <div className="flex gap-1 bg-slate-100 dark:bg-dark-border rounded-lg p-1">
          {[
            { key: 'all', label: `All (${data?.total || 0})` },
            { key: 'stale', label: `Stale (${data?.stale || 0})` },
            { key: 'warning', label: `Aging (${(data?.needsRefresh || 0) - (data?.stale || 0)})` },
            { key: 'fresh', label: `Fresh (${data?.fresh || 0})` },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filter === f.key ? 'bg-white dark:bg-dark-card text-slate-900 dark:text-dark-text shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={filteredPosts.length > 0 && selectedCount === filteredPosts.length}
            onChange={e => toggleAll(e.target.checked)}
            className="rounded border-slate-300 text-brand-600"
          />
          Select all
        </label>
      </div>

      {/* Post list */}
      {loading ? (
        <div className="grid grid-cols-1 gap-2">
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4"><div className="flex items-center gap-2"><Skeleton className="w-4 h-4 rounded" /><div className="flex-1"><Skeleton className="h-4 w-3/4 mb-1" /><Skeleton className="h-3 w-1/2" /></div></div></div>)}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPosts.map(p => (
            <label
              key={p.slug}
              className={`block bg-white dark:bg-dark-card border rounded-xl p-4 hover:bg-slate-50 dark:hover:bg-dark-border cursor-pointer transition ${
                p.stale ? 'border-red-200 dark:border-red-900/30' :
                p.daysSinceUpdate >= WARNING_DAYS ? 'border-amber-200 dark:border-amber-900/30' :
                'border-slate-200 dark:border-dark-border'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={!!selected[p.slug]}
                  onChange={() => toggle(p.slug)}
                  className="mt-1 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-slate-900 dark:text-dark-text truncate">{p.title}</span>
                    <a href={`/posts/${p.slug}`} target="_blank" className="text-xs text-brand-600 hover:underline shrink-0">
                      <ExternalLink className="w-3 h-3 inline" />
                    </a>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-dark-muted flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {p.daysSinceUpdate}d since update
                    </span>
                    <span>· {p.wordCount.toLocaleString()} words</span>
                    <span>· SEO {p.seoScore}</span>
                    <span>· {p.category}</span>
                    {p.stale && <span className="text-red-500 font-medium">STALE</span>}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className={`text-xs font-bold ${
                    p.stale ? 'text-red-500' :
                    p.daysSinceUpdate >= WARNING_DAYS ? 'text-amber-500' :
                    'text-green-500'
                  }`}>
                    {p.daysSinceUpdate}d
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(p.lastUpdated || p.date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </label>
          ))}
        </div>
      )}

      {!loading && filteredPosts.length === 0 && (
        <div className="text-center py-12 text-slate-500 text-sm">No posts match your filter.</div>
      )}

      {/* Summary */}
      {data && (
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-3">
            <div className="text-lg font-bold text-slate-900 dark:text-dark-text">{data.total}</div>
            <div className="text-[10px] text-slate-500">Total Posts</div>
          </div>
          <div className="bg-white dark:bg-dark-card border border-red-200 dark:border-red-900/30 rounded-xl p-3">
            <div className="text-lg font-bold text-red-600">{data.stale}</div>
            <div className="text-[10px] text-slate-500">Stale (&gt;{STALE_DAYS}d)</div>
          </div>
          <div className="bg-white dark:bg-dark-card border border-amber-200 dark:border-amber-900/30 rounded-xl p-3">
            <div className="text-lg font-bold text-amber-600">{data.needsRefresh - data.stale}</div>
            <div className="text-[10px] text-slate-500">Aging (&gt;{WARNING_DAYS}d)</div>
          </div>
          <div className="bg-white dark:bg-dark-card border border-green-200 dark:border-green-900/30 rounded-xl p-3">
            <div className="text-lg font-bold text-green-600">{data.fresh}</div>
            <div className="text-[10px] text-slate-500">Fresh</div>
          </div>
        </div>
      )}
    </div>
  );
}

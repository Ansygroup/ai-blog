'use client';

import { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ExternalLink, CheckSquare, Loader2, Sparkles, RefreshCw, FileText, Wand2, Bot } from 'lucide-react';
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

const BATCH_ACTIONS = [
  { value: 'fix-excerpts', label: 'Fix Excerpts (AI)', icon: FileText, desc: 'Rewrite excerpts with AI for better CTR' },
  { value: 'expand-thin', label: 'Expand Thin Content', icon: RefreshCw, desc: 'Expand posts under 700 words' },
  { value: 'refresh-content', label: 'Refresh Content (AI)', icon: Sparkles, desc: 'Update stale posts with fresh info' },
  { value: 'seo-optimizer', label: 'Run SEO Optimizer', icon: Wand2, desc: 'Fix SEO scores, titles, and metadata' },
  { value: 'humanize', label: 'Humanize (AI)', icon: Bot, desc: 'Remove AI writing patterns' },
];

export default function PostsTable({ posts, loading }) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [batchAction, setBatchAction] = useState('');
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchResults, setBatchResults] = useState(null);
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
      if (sortField === 'date' || sortField === 'lastUpdated') { va = va || ''; vb = vb || ''; }
      if (sortField === 'seoScore') { va = va || 0; vb = vb || 0; }
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
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  }

  function toggleSelect(slug) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  }

  function toggleSelectAll() {
    const pageSlugs = pageItems.map(p => p.slug);
    const allSelected = pageSlugs.every(s => selected.has(s));
    setSelected(prev => {
      const next = new Set(prev);
      pageSlugs.forEach(s => allSelected ? next.delete(s) : next.add(s));
      return next;
    });
  }

  async function runBatchAction() {
    if (!batchAction || selected.size === 0) return;
    setBatchRunning(true);
    setBatchResults(null);
    try {
      const res = await fetch('/admin/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: batchAction, slugs: [...selected] }),
      });
      const data = await res.json();
      setBatchResults(data);
    } catch (err) {
      setBatchResults({ error: err.message });
    }
    setBatchRunning(false);
  }

  if (loading) {
    return <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-8 text-center text-slate-500 dark:text-dark-muted">Loading posts...</div>;
  }

  const actionMeta = BATCH_ACTIONS.find(a => a.value === batchAction);

  return (
    <div className="space-y-4">
      {/* Search + Batch Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title or slug..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); setSelected(new Set()); }}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-sm text-slate-900 dark:text-dark-text placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="text-xs text-slate-500 dark:text-dark-muted whitespace-nowrap">{selected.size} selected</span>
              <select
                value={batchAction}
                onChange={e => setBatchAction(e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-dark-border text-xs bg-white dark:bg-dark-card"
              >
                <option value="">Batch action...</option>
                {BATCH_ACTIONS.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
              <button
                onClick={runBatchAction}
                disabled={!batchAction || batchRunning}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-medium transition"
              >
                {batchRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {batchRunning ? 'Running...' : 'Run'}
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-dark-border text-xs hover:bg-slate-50 dark:hover:bg-dark-border"
              >
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Batch Results */}
      {batchResults && (
        <div className={`rounded-xl border p-4 ${batchResults.error ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20' : 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'}`}>
          {batchResults.error ? (
            <p className="text-sm text-red-700 dark:text-red-400">Error: {batchResults.error}</p>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                  ✅ {batchResults.successCount} succeeded, {batchResults.failCount} failed
                </span>
                <button onClick={() => setBatchResults(null)} className="text-xs text-slate-500 hover:text-slate-700 ml-auto">Dismiss</button>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {batchResults.results?.map(r => (
                  <div key={r.slug} className="text-xs flex items-center gap-2">
                    <span className={r.success ? 'text-green-600' : 'text-red-600'}>{r.success ? '✅' : '❌'}</span>
                    <span className="text-slate-700 dark:text-dark-text font-medium">{r.slug}</span>
                    {r.error && <span className="text-red-500">{r.error}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg">
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={pageItems.length > 0 && pageItems.every(s => selected.has(s.slug))}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                </th>
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
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-500 dark:text-dark-muted text-sm">No posts found</td>
                </tr>
              ) : pageItems.map((post) => (
                <tr key={post.slug} className={`border-b border-slate-100 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-border/50 ${selected.has(post.slug) ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''}`}>
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(post.slug)}
                      onChange={() => toggleSelect(post.slug)}
                      className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                  </td>
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
                  <td className="px-4 py-3 text-slate-600 dark:text-dark-muted whitespace-nowrap">{post.date || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${seoColor(post.seoScore)}`}>{post.seoScore ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {(post.tags || []).slice(0, 3).map((t) => (<Badge key={t}>{t}</Badge>))}
                      {(post.tags || []).length > 3 && <span className="text-xs text-slate-500">+{post.tags.length - 3}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {post.draft ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Draft</span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Published</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-dark-muted">
          <span>{filtered.length} posts total</span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => { setPage(p => p - 1); setSelected(new Set()); }} className="px-3 py-1 rounded border border-slate-200 dark:border-dark-border disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-dark-border cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500">Prev</button>
            <span className="px-2 py-1">{page + 1} / {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => { setPage(p => p + 1); setSelected(new Set()); }} className="px-3 py-1 rounded border border-slate-200 dark:border-dark-border disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-dark-border cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

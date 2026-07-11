'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, ArrowUpDown, ExternalLink, FileText, AlertTriangle, CheckCircle2, Clock, BookOpen, Hash, Link2, Globe, CalendarDays } from 'lucide-react';
import { Skeleton } from '@/components/admin/Skeleton';

export default function ContentAuditPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetch('/admin/api/content-audit')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    let items = data.posts;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(p => p.title.toLowerCase().includes(q) || p.slug.includes(q) || p.category.toLowerCase().includes(q));
    }
    if (filterCategory) items = items.filter(p => p.category === filterCategory);
    if (filterStatus === 'stale') items = items.filter(p => p.daysSinceUpdate !== null && p.daysSinceUpdate > 180);
    if (filterStatus === 'thin') items = items.filter(p => p.wordCount < 700);
    if (filterStatus === 'draft') items = items.filter(p => p.draft);
    if (filterStatus === 'no-excerpt') items = items.filter(p => !p.excerpt);
    if (filterStatus === 'no-internal') items = items.filter(p => p.internalLinks === 0);

    return [...items].sort((a, b) => {
      let va = a[sortField]; let vb = b[sortField];
      if (sortField === 'title' || sortField === 'category') { va = (va || '').toLowerCase(); vb = (vb || '').toLowerCase(); }
      if (sortField === 'date' || sortField === 'lastUpdated') { va = va || ''; vb = vb || ''; }
      if (sortField === 'seoScore' || sortField === 'wordCount' || sortField === 'readingTime' || sortField === 'internalLinks' || sortField === 'externalLinks' || sortField === 'daysSinceUpdate') { va = va ?? -1; vb = vb ?? -1; }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, search, sortField, sortDir, filterCategory, filterStatus]);

  function toggleSort(field) {
    if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  }

  function SortHeader({ field, label }) {
    return (
      <th className="px-3 py-3 text-left font-medium text-slate-600 dark:text-dark-muted cursor-pointer hover:text-slate-900 dark:hover:text-dark-text select-none whitespace-nowrap" onClick={() => toggleSort(field)}>
        <span className="inline-flex items-center gap-1 text-xs">{label}<ArrowUpDown className="w-3 h-3" /></span>
      </th>
    );
  }

  const categories = useMemo(() => data ? [...new Set(data.posts.map(p => p.category))].sort() : [], [data]);

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6"><FileText className="w-5 h-5 text-slate-300" /><div><div className="h-6 w-32 bg-slate-200 dark:bg-dark-border rounded animate-pulse" /><div className="h-4 w-24 bg-slate-100 dark:bg-dark-border rounded animate-pulse mt-1" /></div></div>
        <div className="grid grid-cols-8 gap-2 mb-6">{[1,2,3,4,5,6,7,8].map(i => <div key={i} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-lg p-2.5"><Skeleton className="h-6 w-10 mx-auto mb-1" /><Skeleton className="h-3 w-8 mx-auto" /></div>)}</div>
        <Skeleton className="h-10 w-full mb-4" />
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4">
          <Skeleton className="h-8 w-full mb-2" />
          {[1,2,3,4,5,6,7,8,9,10].map(i => <Skeleton key={i} className="h-6 w-full mb-1.5" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Content Audit</h1>
          <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">{data?.summary.total || 0} posts · all metrics in one view</p>
        </div>
      </div>

      {/* Summary stats */}
      {data?.summary && (
        <div className="grid grid-cols-8 gap-2 mb-6">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-slate-900 dark:text-dark-text">{data.summary.total}</div>
            <div className="text-[10px] text-slate-400">Total</div>
          </div>
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-green-600">{data.summary.published}</div>
            <div className="text-[10px] text-slate-400">Published</div>
          </div>
          <div className="bg-white dark:bg-dark-card border border-amber-200 dark:border-amber-900/30 rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-amber-600">{data.summary.drafts}</div>
            <div className="text-[10px] text-slate-400">Drafts</div>
          </div>
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-indigo-600">{data.summary.avgWordCount.toLocaleString()}</div>
            <div className="text-[10px] text-slate-400">Avg Words</div>
          </div>
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-slate-900 dark:text-dark-text">{data.summary.avgSeo}</div>
            <div className="text-[10px] text-slate-400">Avg SEO</div>
          </div>
          <div className="bg-white dark:bg-dark-card border border-red-200 dark:border-red-900/30 rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-red-600">{data.summary.stale}</div>
            <div className="text-[10px] text-slate-400">Stale</div>
          </div>
          <div className="bg-white dark:bg-dark-card border border-orange-200 dark:border-orange-900/30 rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-orange-600">{data.summary.thinContent}</div>
            <div className="text-[10px] text-slate-400">Thin</div>
          </div>
          <div className="bg-white dark:bg-dark-card border border-amber-200 dark:border-amber-900/30 rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-amber-600">{data.summary.excerptIssues}</div>
            <div className="text-[10px] text-slate-400">Excerpt</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search posts..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-xs">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-xs">
          <option value="">All Status</option>
          <option value="stale">{'Stale (>180 days)'}</option>
          <option value="thin">Thin Content</option>
          <option value="draft">Drafts</option>
          <option value="no-excerpt">Missing Excerpt</option>
          <option value="no-internal">No Internal Links</option>
        </select>
        <span className="text-xs text-slate-400">{filtered.length} posts</span>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg">
                <SortHeader field="title" label="Title" />
                <SortHeader field="category" label="Category" />
                <SortHeader field="wordCount" label="Words" />
                <SortHeader field="readingTime" label="Read" />
                <SortHeader field="seoScore" label="SEO" />
                <SortHeader field="internalLinks" label="Int." />
                <SortHeader field="externalLinks" label="Ext." />
                <SortHeader field="date" label="Date" />
                <SortHeader field="daysSinceUpdate" label="Age" />
                <th className="px-3 py-3 text-left font-medium text-slate-600 dark:text-dark-muted text-xs">Excerpt</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const seoColor = !p.seoScore ? 'text-slate-400' : p.seoScore >= 80 ? 'text-green-600' : p.seoScore >= 60 ? 'text-yellow-600' : 'text-red-600';
                const staleColor = p.daysSinceUpdate === null ? 'text-slate-400' : p.daysSinceUpdate > 365 ? 'text-red-600' : p.daysSinceUpdate > 180 ? 'text-yellow-600' : 'text-green-600';
                return (
                  <tr key={p.slug} className="border-b border-slate-100 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-border/50">
                    <td className="px-3 py-2.5">
                      <a href={`/posts/${p.slug}`} target="_blank" className="inline-flex items-center gap-1 text-slate-900 dark:text-dark-text font-medium hover:text-brand-600">
                        {p.title} <ExternalLink className="w-3 h-3 text-slate-300 shrink-0" />
                      </a>
                      {p.draft && <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1 py-0.5 rounded font-medium">Draft</span>}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">{p.category}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-700 dark:text-dark-text">{p.wordCount.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-slate-500">{p.readingTime}m</td>
                    <td className={`px-3 py-2.5 font-semibold ${seoColor}`}>{p.seoScore ?? '—'}</td>
                    <td className="px-3 py-2.5 text-slate-500">{p.internalLinks}</td>
                    <td className="px-3 py-2.5 text-slate-500">{p.externalLinks}</td>
                    <td className="px-3 py-2.5 text-slate-500">{p.date ? p.date.slice(0, 10) : '—'}</td>
                    <td className={`px-3 py-2.5 font-medium ${staleColor}`}>
                      {p.daysSinceUpdate !== null ? `${p.daysSinceUpdate}d` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-400 max-w-[180px] truncate" title={p.excerpt || ''}>
                      {p.excerpt ? (p.excerptLength < 120 ? '⚠️ ' : '✅ ') + p.excerpt.slice(0, 60) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Search as SearchIcon, Loader2, FileText, ExternalLink, Filter, X } from 'lucide-react';
import { Skeleton, SkeletonCard } from '@/components/admin/Skeleton';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim() && !category && !status) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (category) params.set('category', category);
      if (status) params.set('status', status);
      const res = await fetch(`/admin/api/search?${params}`);
      setData(await res.json());
    } catch {}
    setLoading(false);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <SearchIcon className="w-5 h-5 text-brand-600" />
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Content Search</h1>
          <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">Full-text search across all 195 posts</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search post titles, excerpts, and body text..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-800 dark:text-dark-text placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-700">
            <option value="">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>
          <button type="submit" disabled={loading} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium transition">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <SearchIcon className="w-4 h-4" />}
            Search
          </button>
        </div>
        {data?.categories?.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="w-3 h-3 text-slate-400" />
            <div className="flex flex-wrap gap-1">
              <button type="button" onClick={() => { setCategory(''); handleSearch({ preventDefault: () => {} }); }} className={`px-2 py-0.5 text-[10px] rounded-full border transition ${!category ? 'bg-brand-100 border-brand-300 text-brand-700' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>All</button>
              {data.categories.slice(0, 10).map(c => (
                <button key={c} type="button" onClick={() => { setCategory(c); handleSearch({ preventDefault: () => {} }); }} className={`px-2 py-0.5 text-[10px] rounded-full border transition ${category === c ? 'bg-brand-100 border-brand-300 text-brand-700' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>{c}</button>
              ))}
            </div>
          </div>
        )}
      </form>

      {data && (
        <div className="mb-4 text-sm text-slate-500">
          {data.query ? `Found ${data.total} results for "${data.query}"` : `${data.total} posts`}
          {category && <> in <strong>{category}</strong></>}
          {status && <> · {status}</>}
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl px-4 py-3">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <div className="flex gap-2 mt-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-14" />
              </div>
              <Skeleton className="h-3 w-full mt-2" />
            </div>
          ))}
        </div>
      )}

      {!loading && data?.results?.length > 0 && (
        <div className="space-y-2">
          {data.results.map(p => (
            <div key={p.slug} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl px-4 py-3 hover:border-slate-300 transition">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <a href={`/posts/${p.slug}`} target="_blank" className="text-sm font-medium text-slate-800 dark:text-dark-text hover:text-brand-600 flex items-center gap-1">
                    {p.title} <ExternalLink className="w-3 h-3 opacity-30" />
                  </a>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span>{p.category}</span>
                    <span>·</span>
                    <span>{p.wordCount.toLocaleString()}w</span>
                    <span>·</span>
                    <span>SEO {p.seoScore}</span>
                    {p.draft && <span className="text-amber-500 font-medium">Draft</span>}
                    {p.matchedIn?.length > 0 && p.matchedIn.map(m => (
                      <span key={m} className={`px-1 py-0.5 rounded text-[10px] ${m === 'title' ? 'bg-green-50 text-green-600' : m === 'excerpt' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-green-800'}`}>{m}</span>
                    ))}
                  </div>
                  {p.matchContext && (
                    <p className="text-xs text-slate-500 dark:text-dark-muted mt-1.5 bg-slate-50 dark:bg-dark-border rounded px-2 py-1 leading-relaxed">
                      {p.matchContext}
                    </p>
                  )}
                  {p.excerpt && !p.matchContext && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1">{p.excerpt}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && data?.results?.length === 0 && data !== null && (
        <div className="text-center py-12 text-sm text-slate-400">
          <SearchIcon className="w-8 h-8 mx-auto mb-3 text-slate-300" />
          No results found
        </div>
      )}
    </div>
  );
}

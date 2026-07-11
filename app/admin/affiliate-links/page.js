'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, ExternalLink, DollarSign, Search, FileText, BarChart3, Package, CheckCircle2, AlertCircle, Tag, X } from 'lucide-react';
import { Skeleton, SkeletonCard } from '@/components/admin/Skeleton';

export default function AffiliateLinksPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showUnlinked, setShowUnlinked] = useState(false);

  useEffect(() => {
    fetch('/admin/api/affiliate-links')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6"><ShoppingCart className="w-5 h-5 text-slate-300" /><div><div className="h-6 w-44 bg-slate-200 dark:bg-dark-border rounded animate-pulse" /><div className="h-4 w-32 bg-slate-100 dark:bg-dark-border rounded animate-pulse mt-1" /></div></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</div>
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4 mb-6"><Skeleton className="h-4 w-24 mb-3" /><div className="grid grid-cols-6 gap-2">{[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}</div></div>
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4"><Skeleton className="h-4 w-32 mb-3" /><div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div></div>
      </div>
    );
  }

  const categoryStats = data?.categoryStats || {};
  const cats = Object.keys(categoryStats).filter(k => k !== 'undefined');

  let products = data?.products || [];
  if (search) products = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.asin.includes(search));
  if (catFilter) products = products.filter(p => p.catKey === catFilter);
  if (showUnlinked) products = products.filter(p => !p.linked);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <ShoppingCart className="w-5 h-5 text-brand-600" />
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Affiliate Link Manager</h1>
          <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">
            {data?.totalProducts || 0} products · {data?.linkedProducts || 0} linked · {data?.unlinkedProducts || 0} unlinked · {data?.totalAffiliateLinks || 0} total links
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1"><Package className="w-3 h-3" /> Total Products</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-dark-text">{data?.totalProducts || 0}</div>
        </div>
        <div className="bg-white dark:bg-dark-card border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-green-600 mb-1"><CheckCircle2 className="w-3 h-3" /> Linked</div>
          <div className="text-2xl font-bold text-green-600">{data?.linkedProducts || 0}</div>
        </div>
        <div className="bg-white dark:bg-dark-card border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-amber-600 mb-1"><AlertCircle className="w-3 h-3" /> Unlinked</div>
          <div className="text-2xl font-bold text-amber-600">{data?.unlinkedProducts || 0}</div>
        </div>
        <div className="bg-white dark:bg-dark-card border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-red-600 mb-1"><FileText className="w-3 h-3" /> Zero-Link Posts</div>
          <div className="text-2xl font-bold text-red-600">{data?.postsWithNoLinks || 0}</div>
        </div>
      </div>

      {/* Category Stats */}
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4 mb-6">
        <h2 className="text-xs font-bold text-slate-700 dark:text-dark-text mb-3 uppercase tracking-wider">By Category</h2>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {cats.map(k => {
            const s = categoryStats[k];
            if (!s) return null;
            const pct = s.total ? Math.round(s.linked / s.total * 100) : 0;
            return (
              <div key={k} className="px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-dark-border text-xs">
                <div className="font-medium text-slate-700 dark:text-dark-text truncate">{s.name}</div>
                <div className="text-slate-400 mt-0.5">{s.linked}/{s.total} · {pct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-dark-border flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500" />
          </div>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-700">
            <option value="">All Categories</option>
            {cats.map(k => <option key={k} value={k}>{categoryStats[k]?.name || k}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
            <input type="checkbox" checked={showUnlinked} onChange={e => setShowUnlinked(e.target.checked)} className="rounded border-slate-300" />
            Unlinked only
          </label>
          <span className="text-xs text-slate-400 ml-auto">{products.length} products</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-dark-border max-h-[600px] overflow-y-auto">
          {products.map(p => (
            <div key={p.asin} className="px-4 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${p.linked ? 'bg-green-400' : 'bg-slate-300'}`} />
                    <a href={p.url} target="_blank" className="text-sm font-medium text-slate-800 dark:text-dark-text hover:text-brand-600 truncate block">
                      {p.name} <ExternalLink className="w-2.5 h-2.5 inline opacity-40" />
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 ml-4">
                    <Tag className="w-3 h-3" /> {p.category}
                    {p.price && <><span>·</span><DollarSign className="w-3 h-3" /> ${p.price}</>}
                    {p.rating && <><span>·</span>★ {p.rating}</>}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {p.linked ? (
                    <span className="text-xs text-green-600 font-medium">{p.linkedIn.length} posts</span>
                  ) : (
                    <span className="text-xs text-slate-400">Not linked</span>
                  )}
                </div>
              </div>
              {p.linked && p.linkedIn.length > 0 && (
                <div className="mt-1.5 ml-4 flex flex-wrap gap-1">
                  {p.linkedIn.slice(0, 4).map(l => (
                    <a key={l.slug} href={`/posts/${l.slug}`} target="_blank" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 dark:bg-dark-border text-[10px] text-slate-500 hover:text-brand-600">
                      <FileText className="w-2.5 h-2.5" /> {l.title?.slice(0, 30)}...
                    </a>
                  ))}
                  {p.linkedIn.length > 4 && <span className="text-[10px] text-slate-400">+{p.linkedIn.length - 4} more</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Posts with no affiliate links */}
      {!catFilter && !search && !showUnlinked && data?.zeroLinkPosts?.length > 0 && (
        <div className="bg-white dark:bg-dark-card border border-red-200 dark:border-red-800 rounded-xl mt-6">
          <div className="px-5 py-3 border-b border-red-100 dark:border-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text">Posts with No Affiliate Links ({data?.zeroLinkPosts?.length || 0})</h2>
          </div>
          <div className="divide-y divide-red-50 dark:divide-red-900/20">
            {data?.zeroLinkPosts?.slice(0, 20).map(p => (
              <div key={p.slug} className="px-5 py-2 text-xs text-slate-600 dark:text-dark-muted">
                <a href={`/posts/${p.slug}`} target="_blank" className="hover:text-brand-600">{p.title} <ExternalLink className="w-2.5 h-2.5 inline opacity-30" /></a>
                <span className="text-slate-400 ml-2">{p.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

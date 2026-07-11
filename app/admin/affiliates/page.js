'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Search, ExternalLink, Star, DollarSign, Package, Tag, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { Skeleton, SkeletonCard } from '@/components/admin/Skeleton';

export default function AffiliatesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedCats, setExpandedCats] = useState({});

  useEffect(() => {
    fetch('/admin/api/affiliates')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const categories = data?.categories || {};
  const filteredEntries = Object.entries(categories).filter(([, cat]) =>
    !search || cat.name.toLowerCase().includes(search.toLowerCase()) ||
    cat.products.some(p => p.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <ShoppingCart className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Affiliate Products</h1>
          <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">
            {data ? `${data.totalProducts} products in ${data.totalCategories} categories` : 'Loading...'}
          </p>
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1"><Package className="w-3 h-3" /> Products</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-dark-text">{data.totalProducts}</div>
          </div>
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1"><Tag className="w-3 h-3" /> Categories</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-dark-text">{data.totalCategories}</div>
          </div>
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1"><FileText className="w-3 h-3" /> Posts</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-dark-text">{data.postCount}</div>
          </div>
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">📅 Updated</div>
            <div className="text-lg font-bold text-slate-900 dark:text-dark-text">{data.lastUpdated}</div>
          </div>
        </div>
      )}

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products or categories..."
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-sm focus:ring-2 focus:ring-brand-500 outline-none"
        />
      </div>

      {loading ? (
        <div>
          <div className="grid grid-cols-4 gap-4 mb-6">{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</div>
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => <div key={i} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4"><Skeleton className="h-4 w-48 mb-3" /><div className="grid grid-cols-3 gap-2">{[1,2,3].map(j => <SkeletonCard key={j} />)}</div></div>)}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map(([catKey, cat]) => {
            const isExpanded = expandedCats[catKey];
            return (
              <div key={catKey} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedCats(prev => ({ ...prev, [catKey]: !prev[catKey] }))}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-dark-border transition"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    <span className="font-semibold text-slate-900 dark:text-dark-text text-sm">{cat.name}</span>
                    <span className="text-xs text-slate-400">({cat.products.length} products)</span>
                  </div>
                  <span className="text-xs text-slate-400 truncate max-w-[300px] hidden lg:block">{cat.description}</span>
                </button>
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-dark-border">
                    <div className="divide-y divide-slate-50 dark:divide-dark-border">
                      {cat.products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase())).map(p => (
                        <div key={p.asin} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-dark-border/50">
                          <div className="flex-1 min-w-0">
                            <a
                              href={p.url}
                              target="_blank"
                              rel="noopener"
                              className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-dark-text hover:text-brand-600"
                            >
                              {p.name}
                              <ExternalLink className="w-3 h-3 text-slate-300 shrink-0" />
                            </a>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" /> ${p.price}
                              </span>
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-amber-400" /> {p.rating} ({p.reviewsCount?.toLocaleString()})
                              </span>
                              <span className="text-slate-300">ASIN: {p.asin}</span>
                            </div>
                            {p.description && (
                              <p className="text-xs text-slate-400 mt-1 line-clamp-1">{p.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Link2, ExternalLink, Search, Globe, FileText, ChevronDown, ChevronRight, AlertTriangle, Hash, CheckCircle2 } from 'lucide-react';
import { Skeleton, SkeletonCard } from '@/components/admin/Skeleton';

export default function AdminLinksPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDomain, setFilterDomain] = useState('');
  const [expandedPosts, setExpandedPosts] = useState({});
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetch('/admin/api/links')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  let filteredPosts = (data?.posts || [])
    .filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.slug.includes(search.toLowerCase()));

  if (filterDomain) {
    filteredPosts = filteredPosts.filter(p => p.links.some(l => l.domain === filterDomain));
  }

  if (filterType === 'no-internal') {
    filteredPosts = filteredPosts.filter(p => !p.links.some(l => l.isInternal));
  } else if (filterType === 'no-external') {
    filteredPosts = filteredPosts.filter(p => !p.links.some(l => !l.isInternal));
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Link Checker</h1>
          <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">
            {data ? `${data.totalLinks} links found across ${data.posts.length} posts` : 'Loading...'}
          </p>
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1"><Hash className="w-3 h-3" /> Total</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-dark-text">{data.totalLinks}</div>
          </div>
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1"><Globe className="w-3 h-3" /> External</div>
            <div className="text-2xl font-bold text-blue-600">{data.externalLinks}</div>
          </div>
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1"><CheckCircle2 className="w-3 h-3" /> Internal</div>
            <div className="text-2xl font-bold text-green-600">{data.internalLinks}</div>
          </div>
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1"><Globe className="w-3 h-3" /> Domains</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-dark-text">{data.externalDomains.length}</div>
          </div>
          <div className="bg-white dark:bg-dark-card border border-amber-200 dark:border-amber-900/30 rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1"><AlertTriangle className="w-3 h-3" /> 0 Links</div>
            <div className="text-2xl font-bold text-amber-600">{data.noLinks.length}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4 sticky top-6 space-y-4">
            {/* Filter type */}
            <div>
              <h2 className="text-xs font-bold text-slate-900 dark:text-dark-text uppercase tracking-wider mb-2">Filter</h2>
              <div className="space-y-1">
                {[
                  { value: 'all', label: 'All Posts', count: data?.posts.length },
                  { value: 'no-internal', label: 'Missing Internal Links', count: data?.posts.filter(p => !p.links.some(l => l.isInternal)).length },
                  { value: 'no-external', label: 'Missing External Links', count: data?.posts.filter(p => !p.links.some(l => !l.isInternal)).length },
                ].map(f => (
                  <button
                    key={f.value}
                    onClick={() => setFilterType(f.value)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition flex items-center justify-between ${filterType === f.value ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400 font-medium' : 'text-slate-600 hover:bg-slate-50 dark:hover:bg-dark-border'}`}
                  >
                    <span>{f.label}</span>
                    <span className="text-slate-400">{f.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* External Domains */}
            <div className="pt-3 border-t border-slate-200 dark:border-dark-border">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-slate-500" />
                <h2 className="text-xs font-bold text-slate-900 dark:text-dark-text uppercase tracking-wider">External Domains</h2>
              </div>
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                <button
                  onClick={() => setFilterDomain('')}
                  className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition ${!filterDomain ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400 font-medium' : 'text-slate-600 hover:bg-slate-50 dark:hover:bg-dark-border'}`}
                >
                  All ({data?.externalDomains.reduce((s, d) => s + d.count, 0) || 0})
                </button>
                {data?.externalDomains.map(d => (
                  <button
                    key={d.domain}
                    onClick={() => setFilterDomain(d.domain)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition flex items-center justify-between ${filterDomain === d.domain ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400 font-medium' : 'text-slate-600 hover:bg-slate-50 dark:hover:bg-dark-border'}`}
                  >
                    <span className="truncate">{d.domain}</span>
                    <span className="text-slate-400 ml-2 shrink-0">{d.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Posts with no links */}
            {data?.noLinks.length > 0 && (
              <div className="pt-3 border-t border-slate-200 dark:border-dark-border">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <h3 className="text-xs font-medium text-slate-700 dark:text-dark-text">No Links ({data.noLinks.length})</h3>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {data.noLinks.map(p => (
                    <a key={p.slug} href={`/posts/${p.slug}`} target="_blank" className="block text-xs text-slate-500 hover:text-brand-600 truncate">{p.title}</a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search posts..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => <div key={i} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4"><Skeleton className="h-5 w-3/4 mb-2" /><Skeleton className="h-3 w-1/2" /></div>)}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPosts.length === 0 && (
                <div className="text-center py-12 text-slate-400">No posts match the current filters.</div>
              )}
              {filteredPosts.slice(0, 100).map(p => (
                <div key={p.slug} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedPosts(prev => ({ ...prev, [p.slug]: !prev[p.slug] }))}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-dark-border transition text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {expandedPosts[p.slug] ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-sm font-semibold text-slate-900 dark:text-dark-text truncate">{p.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
                      <span className="text-green-600">{p.links.filter(l => l.isInternal).length} int</span>
                      <span className="text-blue-600">{p.links.filter(l => !l.isInternal).length} ext</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-400">{p.count}</span>
                    </div>
                  </button>
                  {expandedPosts[p.slug] && (
                    <div className="border-t border-slate-100 dark:border-dark-border px-4 pb-3">
                      <div className="mt-2 space-y-1 max-h-80 overflow-y-auto">
                        {p.links.map((l, i) => (
                          <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-dark-border text-xs">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${l.isInternal ? 'bg-green-400' : 'bg-blue-400'}`} />
                            <span className="text-slate-500 dark:text-dark-muted truncate max-w-[200px]">{l.text || '(no text)'}</span>
                            <span className="text-slate-300">→</span>
                            <a
                              href={l.url}
                              target="_blank"
                              rel="noopener"
                              className="text-blue-600 dark:text-blue-400 hover:underline truncate flex-1"
                            >
                              {l.url}
                            </a>
                            {!l.isInternal && (
                              <a href={l.url} target="_blank" rel="noopener" className="shrink-0 p-1 text-slate-400 hover:text-brand-600">
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Hash, Search, Merge, Trash2, ChevronDown, ChevronRight, Loader2, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { Skeleton, SkeletonCard } from '@/components/admin/Skeleton';

export default function TagsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});
  const [mergeFrom, setMergeFrom] = useState('');
  const [mergeTo, setMergeTo] = useState('');
  const [processing, setProcessing] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/admin/api/tags')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleMerge() {
    if (!mergeFrom || !mergeTo || mergeFrom === mergeTo) return;
    setProcessing('merge');
    setMessage('');
    try {
      const res = await fetch('/admin/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'merge', fromTag: mergeFrom, toTag: mergeTo }),
      });
      const d = await res.json();
      if (d.success) {
        setMessage(`✅ Merged "${mergeFrom}" → "${mergeTo}" (${d.modified} posts updated)`);
        setMergeFrom('');
        setMergeTo('');
        const r2 = await fetch('/admin/api/tags');
        setData(await r2.json());
      }
    } catch {}
    setProcessing(null);
  }

  async function handleDelete(tag) {
    if (!confirm(`Delete tag "${tag}" from all posts?`)) return;
    setProcessing(tag);
    setMessage('');
    try {
      const res = await fetch('/admin/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', fromTag: tag }),
      });
      const d = await res.json();
      if (d.success) {
        setMessage(`🗑️ Removed "${tag}" from ${d.modified} posts`);
        const r2 = await fetch('/admin/api/tags');
        setData(await r2.json());
      }
    } catch {}
    setProcessing(null);
  }

  const filtered = data?.tags.filter(t => t.tag.toLowerCase().includes(search.toLowerCase())) || [];
  const totalUsed = data?.tags.reduce((s, t) => s + t.count, 0) || 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Hash className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Tag Manager</h1>
          <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">
            {data ? `${data.totalTags} unique tags across ${data.totalPosts} posts (${totalUsed} total usages)` : 'Loading...'}
          </p>
        </div>
      </div>

      {message && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30 text-sm text-green-700 dark:text-green-400">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tag list */}
        <div className="lg:col-span-2">
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tags..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-dark-text text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
            />
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-3 flex items-center justify-between"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-8 rounded-full" /></div>)}
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map(t => (
                <div key={t.tag} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpanded(prev => ({ ...prev, [t.tag]: !prev[t.tag] }))}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-dark-border transition text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {expanded[t.tag] ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
                      <span className="text-sm font-semibold text-slate-900 dark:text-dark-text">{t.tag}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        t.count >= 20 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        t.count >= 10 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-slate-100 text-slate-600 dark:bg-dark-border dark:text-dark-muted'
                      }`}>
                        {t.count} posts
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(t.tag); }}
                        disabled={processing === t.tag}
                        className="p-1 text-red-800 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                        title="Remove tag from all posts"
                      >
                        {processing === t.tag ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </button>
                  {expanded[t.tag] && (
                    <div className="px-4 pb-3 pt-0 border-t border-slate-100 dark:border-dark-border">
                      <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                        {t.posts.map(p => (
                          <div key={p.slug} className="flex items-center gap-2 text-xs text-slate-600 dark:text-dark-muted">
                            <FileText className="w-3 h-3 shrink-0" />
                            <a href={`/posts/${p.slug}`} target="_blank" className="hover:text-brand-600 truncate">{p.title}</a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">No tags match your search.</div>
          )}
        </div>

        {/* Merge panel */}
        <div>
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5 sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <Merge className="w-4 h-4 text-brand-600" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text">Merge Tags</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-dark-muted mb-4">
              Merge one tag into another across all posts. The source tag will be replaced everywhere.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-dark-muted mb-1">From</label>
                <input
                  value={mergeFrom}
                  onChange={e => setMergeFrom(e.target.value)}
                  list="tags-list"
                  placeholder="Source tag"
                  className="w-full rounded-lg border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-dark-text px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-dark-muted mb-1">To</label>
                <input
                  value={mergeTo}
                  onChange={e => setMergeTo(e.target.value)}
                  list="tags-list"
                  placeholder="Target tag"
                  className="w-full rounded-lg border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-dark-text px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <datalist id="tags-list">
                {data?.tags.map(t => <option key={t.tag} value={t.tag} />)}
              </datalist>
              <button
                onClick={handleMerge}
                disabled={processing === 'merge' || !mergeFrom || !mergeTo || mergeFrom === mergeTo}
                className="w-full px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white text-xs font-medium transition flex items-center justify-center gap-1.5"
              >
                {processing === 'merge' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Merge className="w-3.5 h-3.5" />}
                {processing === 'merge' ? 'Merging...' : 'Merge Tags'}
              </button>
            </div>

            {/* Canonical tags */}
            {data?.canonicalTags && (
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-dark-border">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <h2 className="text-xs font-bold text-slate-900 dark:text-dark-text uppercase tracking-wider">Canonical Tags ({data.canonicalTags.length})</h2>
                </div>
                <div className="flex flex-wrap gap-1">
                  {data.canonicalTags.map(t => (
                    <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      data.tags.find(tg => tg.tag === t) ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

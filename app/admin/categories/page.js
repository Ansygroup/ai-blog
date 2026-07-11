'use client';

import { useState, useEffect } from 'react';
import { Tag, Search, ChevronDown, ChevronRight, FileText, ExternalLink, Loader2, Check, X, Edit2, Save, Merge } from 'lucide-react';
import { Skeleton, SkeletonCard } from '@/components/admin/Skeleton';

export default function CategoriesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedCat, setExpandedCat] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/admin/api/categories')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = data?.categories?.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.posts.some(p => p.title.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  async function handleRename(oldName) {
    if (!newName.trim() || newName === oldName) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/admin/api/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName, newName: newName.trim() }),
      });
      const d = await res.json();
      if (d.success) {
        setMessage(`✅ ${d.modified} posts renamed from "${oldName}" → "${newName}"`);
        setRenaming(null);
        setNewName('');
        const res2 = await fetch('/admin/api/categories');
        const d2 = await res2.json();
        setData(d2);
      } else {
        setMessage(`❌ ${d.error}`);
      }
    } catch {}
    setSaving(false);
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6"><Tag className="w-5 h-5 text-slate-300" /><div><div className="h-6 w-32 bg-slate-200 dark:bg-dark-border rounded animate-pulse" /><div className="h-4 w-20 bg-slate-100 dark:bg-dark-border rounded animate-pulse mt-1" /></div></div>
        <Skeleton className="h-10 w-full mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-8 rounded-full" />
              </div>
              <div className="mt-3 space-y-2">
                {[1,2,3].map(j => <Skeleton key={j} className="h-6 w-full" />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Tag className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Categories</h1>
          <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">{data?.categories?.length || 0} categories · {data?.total || 0} posts</p>
        </div>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search categories or posts..." className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
      </div>

      {message && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-400">{message}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(cat => (
          <div key={cat.name} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-dark-border transition"
              onClick={() => setExpandedCat(expandedCat === cat.name ? null : cat.name)}
            >
              <div className="flex items-center gap-3">
                {expandedCat === cat.name ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                {renaming === cat.name ? (
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <input
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      className="px-2 py-1 rounded border border-brand-300 text-sm bg-white dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-brand-500"
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') handleRename(cat.name); if (e.key === 'Escape') setRenaming(null); }}
                    />
                    <button onClick={() => handleRename(cat.name)} disabled={saving} className="p-1 text-green-600 hover:bg-green-50 rounded">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </button>
                    <button onClick={() => { setRenaming(null); setNewName(''); }} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <span className="font-semibold text-slate-900 dark:text-dark-text text-sm">{cat.name}</span>
                )}
                <span className="text-xs bg-slate-100 dark:bg-dark-border text-slate-600 dark:text-dark-muted px-2 py-0.5 rounded-full font-medium">{cat.count}</span>
              </div>
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                {renaming !== cat.name && (
                  <button
                    onClick={() => { setRenaming(cat.name); setNewName(cat.name); }}
                    className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-dark-border rounded-lg transition"
                    title="Rename category"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            {expandedCat === cat.name && (
              <div className="border-t border-slate-100 dark:border-dark-border px-4 py-2 space-y-1 max-h-48 overflow-y-auto">
                {cat.posts.map(p => (
                  <a key={p.slug} href={`/posts/${p.slug}`} target="_blank" className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-dark-border text-xs text-slate-600 dark:text-dark-muted group">
                    <FileText className="w-3 h-3 shrink-0" />
                    <span className="flex-1 truncate">{p.title}</span>
                    <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-brand-400 shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

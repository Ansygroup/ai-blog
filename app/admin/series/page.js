'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Save, X, ChevronRight, GripVertical, Search } from 'lucide-react';
import { Skeleton } from '@/components/admin/Skeleton';

export default function AdminSeriesPage() {
  const [series, setSeries] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/admin/api/series').then(r => r.json()).then(d => {
      setSeries(d.series || []);
      setAllPosts(d.posts || []);
      setLoading(false);
    });
  }, []);

  async function save(entry) {
    const action = series.find(s => s.slug === entry.slug) ? 'update' : 'create';
    const res = await fetch('/admin/api/series', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...entry }),
    });
    const data = await res.json();
    if (data.series) setSeries(data.series);
    setEditing(null);
  }

  async function remove(slug) {
    const res = await fetch('/admin/api/series', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', slug }),
    });
    const data = await res.json();
    if (data.series) setSeries(data.series);
  }

  function Editor({ entry }) {
    const [form, setForm] = useState(entry || { slug: '', title: '', description: '', category: '', cover: '', posts: [] });
    const [postSearch, setPostSearch] = useState('');
    const filteredPosts = allPosts.filter(p =>
      !postSearch || p.title?.toLowerCase().includes(postSearch.toLowerCase())
    );

    function togglePost(slug) {
      setForm(f => ({
        ...f,
        posts: f.posts.includes(slug) ? f.posts.filter(s => s !== slug) : [...f.posts, slug],
      }));
    }

    function autoSlug(title) {
      setForm(f => ({ ...f, slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) }));
    }

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="p-6 border-b border-slate-200 dark:border-dark-border flex items-center justify-between">
            <h2 className="text-lg font-bold">{entry ? 'Edit Series' : 'New Series'}</h2>
            <button onClick={() => setEditing(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-dark-border rounded-lg"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Title</label>
                <input value={form.title} onChange={e => { setForm(f => ({ ...f, title: e.target.value })); if (!entry) autoSlug(e.target.value); }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-dark-border bg-transparent text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Slug</label>
                <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-dark-border bg-transparent text-sm focus:ring-2 focus:ring-brand-500 outline-none font-mono" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Category</label>
                <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-dark-border bg-transparent text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-dark-border bg-transparent text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Posts ({form.posts.length} selected)</label>
              <input value={postSearch} onChange={e => setPostSearch(e.target.value)} placeholder="Search posts..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-dark-border bg-transparent text-sm focus:ring-2 focus:ring-brand-500 outline-none mb-2" />
              <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-dark-border rounded-xl divide-y divide-slate-100 dark:divide-dark-border">
                {filteredPosts.map(p => (
                  <button key={p.slug} onClick={() => togglePost(p.slug)}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-dark-border transition ${form.posts.includes(p.slug) ? 'bg-brand-50 dark:bg-brand-900/20' : ''}`}>
                    <input type="checkbox" checked={form.posts.includes(p.slug)} readOnly className="w-4 h-4 rounded border-slate-300 text-brand-600" />
                    <span className="flex-1 truncate">{p.title}</span>
                    <span className="text-xs text-slate-400">{p.readingTime} min</span>
                  </button>
                ))}
                {filteredPosts.length === 0 && <p className="text-sm text-slate-400 p-3 text-center">No posts found</p>}
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-slate-200 dark:border-dark-border flex justify-end gap-3">
            <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium">Cancel</button>
            <button onClick={() => save(form)} className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold flex items-center gap-2">
              <Save className="w-4 h-4" /> Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Series</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">Manage post series for guided reading experiences</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4"><Skeleton className="h-5 w-48 mb-2" /><Skeleton className="h-3 w-72 mb-1" /><Skeleton className="h-3 w-24" /></div>)}
        </div>
      ) : (
        <>
          <button onClick={() => setEditing({ slug: '', title: '', description: '', category: '', cover: '', posts: [] })}
            className="mb-4 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Series
          </button>

          <div className="space-y-3">
            {series.map(s => (
              <div key={s.slug} className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-brand-600 shrink-0" />
                      <h3 className="font-semibold text-slate-900 dark:text-dark-text">{s.title}</h3>
                    </div>
                    {s.description && <p className="text-sm text-slate-500 mt-1">{s.description}</p>}
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                      <span>{s.posts.length} articles</span>
                      {s.category && <span>· {s.category}</span>}
                      <span>· slug: <code className="text-brand-600">{s.slug}</code></span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {s.posts.slice(0, 5).map(slug => {
                        const p = allPosts.find(pp => pp.slug === slug);
                        return p ? (
                          <span key={slug} className="px-2 py-0.5 bg-slate-100 dark:bg-dark-border rounded text-xs text-slate-600 dark:text-dark-muted truncate max-w-[200px]">{p.title}</span>
                        ) : <span key={slug} className="px-2 py-0.5 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-500 truncate">{slug}</span>;
                      })}
                      {s.posts.length > 5 && <span className="text-xs text-slate-400">+{s.posts.length - 5} more</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <button onClick={() => setEditing(s)} className="p-2 hover:bg-slate-100 dark:hover:bg-dark-border rounded-lg text-sm">Edit</button>
                    <button onClick={() => remove(s.slug)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {series.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <BookOpen className="w-10 h-10 mx-auto mb-2" />
                <p>No series yet. Create your first one!</p>
              </div>
            )}
          </div>
        </>
      )}

      {editing !== null && <Editor entry={editing} />}
    </div>
  );
}

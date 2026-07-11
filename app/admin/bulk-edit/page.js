'use client';

import { useState, useEffect } from 'react';
import { FileEdit, Loader2, Search, CheckCircle2, X, Send, ExternalLink, PenSquare } from 'lucide-react';

export default function BulkEditPage() {
  const [posts, setPosts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [draft, setDraft] = useState('');
  const [seoScore, setSeoScore] = useState('');
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/admin/api/bulk-edit')
      .then(r => r.json())
      .then(d => { setPosts(d.posts || []); setFiltered(d.posts || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    let f = posts;
    if (search) f = f.filter(p => p.title?.toLowerCase().includes(search.toLowerCase()) || p.slug.includes(search));
    if (catFilter) f = f.filter(p => p.category === catFilter);
    setFiltered(f);
  }, [search, catFilter, posts]);

  function toggle(slug) {
    const s = new Set(selected);
    if (s.has(slug)) s.delete(slug); else s.add(slug);
    setSelected(s);
  }

  function selectAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(p => p.slug)));
  }

  async function handleApply() {
    const changes = {};
    if (category) changes.category = category;
    if (draft) changes.draft = draft;
    if (seoScore) changes.seoScore = seoScore;

    if (Object.keys(changes).length === 0) return;
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch('/admin/api/bulk-edit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slugs: [...selected], changes }),
      });
      setResult(await res.json());
      setSelected(new Set());
    } catch {}
    setSaving(false);
  }

  const categories = [...new Set(posts.map(p => p.category).filter(Boolean))].sort();

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <FileEdit className="w-5 h-5 text-brand-600" />
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Bulk Editor</h1>
          <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">{posts.length} posts · {selected.size} selected</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search posts..." className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-800 dark:text-dark-text focus:outline-none focus:ring-1 focus:ring-brand-500" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-700 dark:text-dark-text focus:outline-none focus:ring-1 focus:ring-brand-500">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-xs text-slate-400">{filtered.length} shown</span>
      </div>

      {/* Post List */}
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl mb-4">
        <div className="px-3 py-2 border-b border-slate-100 dark:border-dark-border flex items-center">
          <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
            <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={selectAll} className="rounded border-slate-300" />
            Select All
          </label>
        </div>
        <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 dark:divide-dark-border">
          {filtered.map(p => (
            <label key={p.slug} className="px-3 py-1.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-dark-border cursor-pointer">
              <input type="checkbox" checked={selected.has(p.slug)} onChange={() => toggle(p.slug)} className="rounded border-slate-300 shrink-0" />
              <a href={`/posts/${p.slug}`} target="_blank" className="text-xs text-slate-700 dark:text-dark-text hover:text-brand-600 truncate flex-1">
                {p.title || p.slug} <ExternalLink className="w-2.5 h-2.5 inline opacity-30" />
              </a>
              <span className="text-xs text-slate-400 w-16 shrink-0">{p.category}</span>
              {p.draft && <span className="text-xs text-amber-500 font-medium w-10 shrink-0">Draft</span>}
              <span className="text-xs text-slate-400 w-12 shrink-0 text-right">SEO {p.seoScore}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Bulk Edit Form */}
      {selected.size > 0 && (
        <div className="bg-white dark:bg-dark-card border border-brand-200 dark:border-brand-800 rounded-xl p-4 mb-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text mb-3">Edit {selected.size} posts</h2>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500">
                <option value="">— No change —</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Draft Status</label>
              <select value={draft} onChange={e => setDraft(e.target.value)} className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500">
                <option value="">— No change —</option>
                <option value="true">Draft</option>
                <option value="false">Published</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">SEO Score</label>
              <input type="number" min="0" max="100" value={seoScore} onChange={e => setSeoScore(e.target.value)} placeholder="0-100" className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
          </div>
          <button onClick={handleApply} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium transition">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {saving ? 'Applying...' : `Apply to ${selected.size} posts`}
          </button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm mb-2">
            <CheckCircle2 className="w-4 h-4" /> Updated {result.updated}/{result.total} posts
          </div>
          {result.results?.filter(r => r.status === 'updated').slice(0, 10).map(r => (
            <p key={r.slug} className="text-xs text-green-600 ml-6">✓ {r.slug}: {r.fields?.join(', ')}</p>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { FileText, Lightbulb, PenSquare, Clock, CheckCircle2, Plus, X, ExternalLink, GripVertical } from 'lucide-react';
import { Skeleton, SkeletonCard } from '@/components/admin/Skeleton';

export default function ContentPipelinePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newIdea, setNewIdea] = useState('');
  const [newNote, setNewNote] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/admin/api/content-pipeline');
      setData(await res.json());
    } catch {}
    setLoading(false);
  }

  async function addIdea() {
    if (!newIdea.trim()) return;
    await fetch('/admin/api/content-pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add-idea', title: newIdea.trim(), note: newNote.trim() }),
    });
    setNewIdea('');
    setNewNote('');
    load();
  }

  async function deleteIdea(title) {
    await fetch('/admin/api/content-pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-idea', title }),
    });
    load();
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6"><GripVertical className="w-5 h-5 text-slate-300" /><div><div className="h-6 w-44 bg-slate-200 dark:bg-dark-border rounded animate-pulse" /><div className="h-4 w-32 bg-slate-100 dark:bg-dark-border rounded animate-pulse mt-1" /></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-slate-50 dark:bg-dark-card/50 border border-slate-200 dark:border-dark-border rounded-xl p-3">
              <Skeleton className="h-4 w-20 mb-3" />
              {[1,2,3].map(j => <div key={j} className="mb-2"><SkeletonCard /></div>)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const columns = [
    { key: 'ideas', label: 'Ideas', icon: Lightbulb, color: 'bg-purple-500', arr: data?.pipeline?.ideas || [], emptyMsg: 'No ideas yet' },
    { key: 'drafts', label: 'Drafts', icon: PenSquare, color: 'bg-amber-500', arr: data?.pipeline?.drafts || [], emptyMsg: 'No drafts' },
    { key: 'scheduled', label: 'Scheduled', icon: Clock, color: 'bg-blue-500', arr: data?.pipeline?.scheduled || [], emptyMsg: 'Nothing scheduled' },
    { key: 'published', label: 'Published', icon: CheckCircle2, color: 'bg-green-500', arr: data?.pipeline?.published || [], emptyMsg: 'No posts yet' },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <GripVertical className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Content Pipeline</h1>
          <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">
            {data?.counts?.ideas || 0} ideas · {data?.counts?.drafts || 0} drafts · {data?.counts?.scheduled || 0} scheduled · {data?.counts?.published || 0} published
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[60vh]">
        {columns.map(col => (
          <div key={col.key} className="bg-slate-50 dark:bg-dark-card/50 border border-slate-200 dark:border-dark-border rounded-xl flex flex-col">
            <div className="px-3 py-2.5 border-b border-slate-200 dark:border-dark-border flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
              <h2 className="text-xs font-bold text-slate-700 dark:text-dark-text uppercase tracking-wider">{col.label}</h2>
              <span className="ml-auto text-xs text-slate-400">{col.arr.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {/* Ideas column gets a text input */}
              {col.key === 'ideas' && (
                <div className="mb-2">
                  <input
                    value={newIdea}
                    onChange={e => setNewIdea(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addIdea()}
                    placeholder="New idea..."
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-800 dark:text-dark-text placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 mb-1"
                  />
                  <input
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder="Note (optional)..."
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-800 dark:text-dark-text placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 mb-1"
                  />
                  <button
                    onClick={addIdea}
                    className="w-full inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 text-xs hover:bg-purple-200 transition"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
              )}

              {col.arr.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">{col.emptyMsg}</p>
              ) : (
                col.arr.map((item, i) => (
                  <div key={item.slug || item.id || i} className="px-2.5 py-2 rounded-lg bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border text-xs">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        {item.title ? (
                          item.slug ? (
                            <a href={`/posts/${item.slug}`} target="_blank" className="font-medium text-slate-800 dark:text-dark-text hover:text-brand-600 truncate block">
                              {item.title} <ExternalLink className="w-2.5 h-2.5 inline -mt-0.5 opacity-50" />
                            </a>
                          ) : (
                            <span className="font-medium text-slate-800 dark:text-dark-text">{item.title}</span>
                          )
                        ) : (
                          <span className="font-medium text-slate-800 dark:text-dark-text">{item.title || item.slug}</span>
                        )}
                      </div>
                      {col.key === 'ideas' && (
                        <button onClick={() => deleteIdea(item.title)} className="p-0.5 text-slate-300 hover:text-red-400 shrink-0"><X className="w-3 h-3" /></button>
                      )}
                    </div>
                    {item.note && <p className="text-slate-400 mt-1 leading-relaxed">{item.note}</p>}
                    <div className="flex items-center gap-2 text-slate-400 mt-1">
                      {item.category && <span>{item.category}</span>}
                      {item.wordCount && <span>· {item.wordCount.toLocaleString()}w</span>}
                      {item.scheduledDate && <span>· {new Date(item.scheduledDate).toLocaleDateString()}</span>}
                      {item.seoScore && <span>· SEO {item.seoScore}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

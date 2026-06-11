'use client';

import { useState } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import Badge from '@/components/ui/Badge';

export default function QueueList({ topics, loading, onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState('AI News');
  const [keywords, setKeywords] = useState('');
  const [adding, setAdding] = useState(false);

  const categories = {};
  (topics || []).forEach((t) => {
    const cat = t.category || 'Uncategorized';
    categories[cat] = (categories[cat] || 0) + 1;
  });

  async function handleSubmit(e) {
    e.preventDefault();
    if (!topic.trim()) return;
    setAdding(true);
    try {
      await onAdd({
        topic: topic.trim(),
        category,
        keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
      });
      setTopic('');
      setKeywords('');
      setShowForm(false);
    } catch (err) {
      console.error(err);
    }
    setAdding(false);
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white dark:bg-dark-card dark:border-dark-border p-8 text-center text-slate-500 dark:text-dark-muted">
        Loading queue...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-lg font-bold font-heading text-slate-900 dark:text-dark-text">
            {(topics || []).length} topics
          </span>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {Object.entries(categories).map(([cat, count]) => (
              <Badge key={cat}>
                {cat} ({count})
              </Badge>
            ))}
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Add Topic'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white dark:bg-dark-card dark:border-dark-border p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-dark-muted mb-1">Topic</label>
            <input
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Topic title..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-dark-muted mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {['AI News', 'Reviews', 'Comparisons', 'Tutorials', 'Best Of'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-dark-muted mb-1">Keywords (comma-separated)</label>
            <input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="ai, machine learning, ..."
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {adding ? 'Adding...' : 'Add to Queue'}
          </button>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 bg-white dark:bg-dark-card dark:border-dark-border divide-y divide-slate-100 dark:divide-dark-border max-h-[60vh] overflow-y-auto">
        {(topics || []).map((item, i) => (
          <div key={item.topic || i} className="px-4 py-3 flex items-start justify-between hover:bg-slate-50 dark:hover:bg-dark-border/50 group">
            <div className="min-w-0 flex-1">
              <div className="text-sm text-slate-900 dark:text-dark-text font-medium truncate">{item.topic}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-dark-border dark:text-dark-muted">
                  {item.category || 'Uncategorized'}
                </span>
                {(item.keywords || []).slice(0, 3).map((k) => (
                  <span key={k} className="text-xs text-slate-400 dark:text-dark-muted">#{k}</span>
                ))}
              </div>
            </div>
            {onDelete && (
              <button
                onClick={() => onDelete(item.topic)}
                className="shrink-0 p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                title="Remove topic"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        {(!topics || topics.length === 0) && (
          <div className="p-8 text-center text-slate-500 dark:text-dark-muted text-sm">
            Queue is empty — add topics above
          </div>
        )}
      </div>
    </div>
  );
}

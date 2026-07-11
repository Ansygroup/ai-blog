'use client';

import { useState, useEffect } from 'react';
import { Search, CheckCircle2, AlertTriangle, Loader2, Sparkles, ArrowUp, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Skeleton, SkeletonCard } from '@/components/admin/Skeleton';

const issueLabels = {
  'excerpt-too-short': 'Excerpt < 50 chars',
  'excerpt-too-long': 'Excerpt > 165 chars',
  'missing-year': 'Missing 2026',
  'title-too-long': 'Title > 70 chars',
  'title-too-short': 'Title < 20 chars',
};

function issueColor(issue) {
  if (issue.includes('missing')) return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
  if (issue.includes('long')) return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400';
  return 'text-slate-600 bg-slate-100 dark:bg-dark-border dark:text-dark-muted';
}

export default function SEOMetaPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editExcerpt, setEditExcerpt] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/admin/api/seo-meta')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave(slug) {
    setSaving(slug);
    setMessage('');
    try {
      const res = await fetch('/admin/api/seo-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, title: editTitle, excerpt: editExcerpt }),
      });
      const d = await res.json();
      if (d.success) {
        setMessage(`✅ ${slug} updated`);
        setEditingId(null);
        // Refresh data
        const r2 = await fetch('/admin/api/seo-meta');
        const d2 = await r2.json();
        setData(d2);
      }
    } catch {}
    setSaving(null);
  }

  async function handleBulkFix() {
    if (!data?.posts) return;
    setSaving('bulk');
    const slugs = data.posts.filter(p => p.issues.length > 0).map(p => p.slug);
    try {
      const res = await fetch('/admin/api/seo-meta', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slugs }),
      });
      const d = await res.json();
      if (d.success) {
        setMessage(`✅ Bulk fixed ${d.applied} post(s). Refreshing...`);
        const r2 = await fetch('/admin/api/seo-meta');
        const d2 = await r2.json();
        setData(d2);
      }
    } catch {}
    setSaving(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <div>
            <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">
              SEO Meta Generator
            </h1>
            <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">
              Review and fix meta descriptions, titles, and year tags across all posts
            </p>
          </div>
        </div>
        {data && data.needsHelp > 0 && (
          <button
            onClick={handleBulkFix}
            disabled={saving === 'bulk'}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white text-sm font-medium transition"
          >
            {saving === 'bulk' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {saving === 'bulk' ? 'Fixing...' : `Auto-Fix ${data.needsHelp} Posts`}
          </button>
        )}
      </div>

      {message && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-sm text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/30">
          {message}
        </div>
      )}

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4">
            <div className="text-2xl font-bold text-slate-900 dark:text-dark-text">{data.total}</div>
            <div className="text-xs text-slate-500 dark:text-dark-muted">Total Posts</div>
          </div>
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4">
            <div className={`text-2xl font-bold ${data.needsHelp > 0 ? 'text-amber-600' : 'text-green-600'}`}>{data.needsHelp}</div>
            <div className="text-xs text-slate-500 dark:text-dark-muted">Need SEO Help</div>
          </div>
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4">
            <div className="text-2xl font-bold text-green-600">{data.allGood}</div>
            <div className="text-xs text-slate-500 dark:text-dark-muted">All Good</div>
          </div>
        </div>
      )}

      {/* Post list */}
      {loading ? (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
          <div className="space-y-2">
            {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4"><Skeleton className="h-4 w-3/4 mb-2" /><Skeleton className="h-3 w-full mb-1" /><Skeleton className="h-3 w-1/2" /></div>)}
          </div>
        </div>
      ) : !data ? (
        <div className="text-center py-12 text-slate-500">Failed to load posts.</div>
      ) : data.posts.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
          <p>All posts have good SEO metadata!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.posts.map(post => (
            <div key={post.slug} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-slate-900 dark:text-dark-text truncate">{post.title}</span>
                    <a href={`/posts/${post.slug}`} target="_blank" className="text-xs text-brand-600 hover:underline shrink-0">view</a>
                  </div>
                  <div className="text-xs text-slate-400 mb-2">
                    {post.category} · {post.wordCount.toLocaleString()} words · {post.date || 'no date'}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {post.issues.map(issue => (
                      <span key={issue} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${issueColor(issue)}`}>
                        {issueLabels[issue] || issue}
                      </span>
                    ))}
                  </div>
                  {editingId === post.slug ? (
                    <div className="space-y-2 mt-2">
                      <div>
                        <label className="text-xs text-slate-500 block mb-0.5">Title</label>
                        <input
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-dark-text px-3 py-1.5 text-xs focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 block mb-0.5">Meta Description</label>
                        <textarea
                          value={editExcerpt}
                          onChange={e => setEditExcerpt(e.target.value)}
                          rows={2}
                          className="w-full rounded-lg border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-dark-text px-3 py-1.5 text-xs focus:ring-2 focus:ring-brand-500 resize-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSave(post.slug)}
                          disabled={saving === post.slug}
                          className="px-3 py-1 rounded-lg bg-brand-600 text-white text-xs font-medium hover:bg-brand-700 disabled:opacity-50 transition"
                        >
                          {saving === post.slug ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 space-y-0.5">
                      <div><span className="text-slate-400">Title:</span> {post.title}</div>
                      <div><span className="text-slate-400">Excerpt:</span> {post.excerpt || <span className="italic text-red-400">missing</span>}</div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setEditingId(post.slug);
                    setEditTitle(post.title);
                    setEditExcerpt(post.excerpt || '');
                  }}
                  className="shrink-0 p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-dark-border rounded-lg transition"
                >
                  <FileText className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

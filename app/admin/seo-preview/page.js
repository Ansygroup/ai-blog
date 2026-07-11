'use client';

import { useState, useEffect } from 'react';
import { Search, Eye, ExternalLink, FileText, Hash, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { Skeleton } from '@/components/admin/Skeleton';

export default function SeoPreviewPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    fetch('/admin/api/seo-preview')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function loadPreview(slug) {
    setSelected(slug);
    setPreview(null);
    const res = await fetch(`/admin/api/seo-preview?slug=${slug}`);
    const d = await res.json();
    setPreview(d);
  }

  const filtered = data?.posts?.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.slug.includes(search.toLowerCase())
  ) || [];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Eye className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">SEO Preview</h1>
          <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">See how your posts appear in search results</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Post list */}
        <div>
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search posts..." className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
          </div>

          {loading ? (
            <div className="space-y-1">
              {[1,2,3,4,5,6,7,8,9,10].map(i => <div key={i} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-3"><Skeleton className="h-4 w-3/4 mb-1" /><Skeleton className="h-3 w-1/4" /></div>)}
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.slice(0, 50).map(p => (
                <button
                  key={p.slug}
                  onClick={() => loadPreview(p.slug)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition flex items-center justify-between ${
                    selected === p.slug ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400 border border-brand-200' : 'bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-border text-slate-700 dark:text-dark-text'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 shrink-0 text-slate-400" />
                    <span className="truncate">{p.title || p.slug}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs shrink-0">
                    <span className={`font-semibold ${!p.seoScore ? 'text-slate-400' : p.seoScore >= 80 ? 'text-green-600' : p.seoScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {p.seoScore || '—'}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-400">{p.wordCount.toLocaleString()}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Preview panel */}
        <div>
          {!preview && (
            <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-8 text-center text-slate-400">
              <Eye className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Select a post to preview</p>
            </div>
          )}

          {preview && (
            <div className="space-y-4">
              {/* Google Search Result Preview */}
              <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Google Search Result Preview</h2>
                <div className="bg-white rounded-lg border border-slate-200 p-4 max-w-lg">
                  <div className="text-[12px] text-green-800 dark:text-green-400 truncate">{preview.previewUrl}</div>
                  <div className="text-sm font-semibold text-blue-800 dark:text-blue-400 leading-snug my-1 cursor-pointer hover:underline">
                    {preview.post.title}
                  </div>
                  {preview.post.excerpt ? (
                    <div className="text-[12px] text-slate-600 dark:text-dark-muted leading-relaxed">
                      {preview.post.excerpt.slice(0, 160)}
                      {preview.post.excerpt.length > 160 && '...'}
                    </div>
                  ) : (
                    <div className="text-[12px] text-red-500 italic">⚠️ No meta description — add an excerpt</div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Post Stats</h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Title', value: preview.post.title, highlight: preview.post.title.length > 60 ? 'red' : 'green' },
                    { label: 'Excerpt', value: preview.post.excerpt ? `${preview.post.excerpt.length} chars` : 'Missing!', highlight: !preview.post.excerpt ? 'red' : preview.post.excerpt.length >= 120 && preview.post.excerpt.length <= 160 ? 'green' : 'yellow' },
                    { label: 'SEO Score', value: `${preview.post.seoScore || 'N/A'}`, highlight: !preview.post.seoScore ? 'yellow' : preview.post.seoScore >= 80 ? 'green' : preview.post.seoScore >= 60 ? 'yellow' : 'red' },
                    { label: 'Words', value: preview.post.wordCount.toLocaleString(), highlight: preview.post.wordCount >= 700 ? 'green' : 'red' },
                  ].map(s => (
                    <div key={s.label} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 dark:bg-dark-border">
                      {s.highlight === 'green' ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> : s.highlight === 'red' ? <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" /> : <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                      <div>
                        <div className="text-xs font-medium text-slate-700 dark:text-dark-text">{s.label}</div>
                        <div className={`text-xs ${s.highlight === 'green' ? 'text-green-600' : s.highlight === 'red' ? 'text-red-600' : 'text-amber-600'}`}>{s.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <a
                  href={preview.previewUrl}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-dark-border text-sm text-slate-600 hover:bg-slate-50 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Post
                </a>
                <a
                  href={`/admin/seo-meta?slug=${selected}`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition"
                >
                  <Eye className="w-4 h-4" />
                  Edit SEO Meta
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Mail, FileText, Sparkles, Copy, CheckCircle2, Loader2, Eye, CalendarDays, ExternalLink, Download } from 'lucide-react';
import { Skeleton } from '@/components/admin/Skeleton';

export default function NewsletterPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState({});
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [subCount, setSubCount] = useState(null);

  useEffect(() => {
    fetch('/admin/api/newsletter')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
    fetch('/admin/api/subscribers')
      .then(r => r.json())
      .then(d => setSubCount(d.count))
      .catch(() => setSubCount(0));
  }, []);

  useEffect(() => {
    if (data) {
      const all = {};
      data.recentPosts?.forEach(p => { all[p.slug] = true; });
      setSelected(all);
    }
  }, [data?.recentPosts?.length]);

  function toggleAll(checked) {
    const all = {};
    data.recentPosts?.forEach(p => { all[p.slug] = checked; });
    setSelected(all);
  }

  function toggle(slug) {
    setSelected(prev => ({ ...prev, [slug]: !prev[slug] }));
  }

  async function handleGenerate() {
    const slugs = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
    if (slugs.length === 0) return;
    setGenerating(true);
    setResult(null);
    try {
      const res = await fetch('/admin/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slugs }),
      });
      const d = await res.json();
      if (d.success) setResult(d);
    } catch {}
    setGenerating(false);
  }

  async function copyContent() {
    if (!result?.content) return;
    await navigator.clipboard.writeText(result.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Mail className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Newsletter Generator</h1>
          <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">Create weekly digest newsletters from recent posts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscribers card */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text">Subscribers</h2>
                <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">
                  {subCount === null ? 'Loading…' : `${subCount} captured`} · stored locally in public/data/subscribers.json
                </p>
              </div>
            </div>
            <a href="/admin/api/subscribers?format=csv" className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
              <Download className="w-4 h-4" /> Export CSV
            </a>
          </div>
        </div>

        {/* Post selection */}
        <div>
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text">Recent Posts</h2>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={selectedCount === data?.recentPosts?.length} onChange={e => toggleAll(e.target.checked)} className="rounded border-slate-300 text-brand-600" />
                  All
                </label>
                <span>{selectedCount} selected</span>
              </div>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1,2,3,4,5].map(i => <div key={i} className="flex items-center gap-3 p-2"><Skeleton className="w-4 h-4 rounded" /><div className="flex-1"><Skeleton className="h-4 w-48 mb-1" /><Skeleton className="h-3 w-24" /></div></div>)}
              </div>
            ) : data?.recentPosts?.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">No posts from this week.</div>
            ) : (
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {data?.recentPosts?.map(p => (
                  <label key={p.slug} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-dark-border cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={!!selected[p.slug]}
                      onChange={() => toggle(p.slug)}
                      className="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-dark-text truncate">{p.title}</div>
                      <div className="text-xs text-slate-400">
                        {p.category} · {new Date(p.date).toLocaleDateString()}
                      </div>
                    </div>
                    <a href={`/posts/${p.slug}`} target="_blank" className="shrink-0 p-1 text-slate-400 hover:text-brand-600">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </label>
                ))}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating || selectedCount === 0}
              className="w-full mt-4 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white text-sm font-medium transition flex items-center justify-center gap-2"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? 'Generating...' : `Generate Newsletter (${selectedCount} posts)`}
            </button>
          </div>

          {/* Digest history */}
          {data?.history?.length > 0 && (
            <div className="mt-4 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text mb-3">Past Digests</h2>
              <div className="space-y-1">
                {data.history.map(h => (
                  <a key={h.file} href={h.path} target="_blank" className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-dark-border text-sm text-slate-600 dark:text-dark-muted transition">
                    <FileText className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{h.file}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        <div>
          {result ? (
            <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text">Generated</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{result.postCount} posts</span>
                  <button
                    onClick={copyContent}
                    className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-dark-border rounded-lg transition"
                    title={copied ? 'Copied!' : 'Copy to clipboard'}
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-dark-border rounded-lg p-4 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto text-slate-700 dark:text-dark-text">
                {result.content}
              </div>
              <p className="text-xs text-slate-400 mt-3">Saved to <code className="text-brand-600">public/digests/{result.fileName}</code></p>
            </div>
          ) : (
            <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5 flex flex-col items-center justify-center min-h-[300px] text-center">
              <Mail className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">Select posts and click generate to preview</p>
              <p className="text-xs text-slate-400 mt-1">The newsletter will be saved as a markdown file</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

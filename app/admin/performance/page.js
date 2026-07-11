'use client';

import { useState, useEffect } from 'react';
import { BarChart3, AlertTriangle, CheckCircle2, TrendingUp, FileText, BookOpen, RefreshCw, ExternalLink, Zap, AlertCircle } from 'lucide-react';
import { SkeletonCard } from '@/components/admin/Skeleton';

export default function PerformancePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetch('/admin/api/performance').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6"><BarChart3 className="w-5 h-5 text-slate-300" /><div><div className="h-6 w-40 bg-slate-200 dark:bg-dark-border rounded animate-pulse" /><div className="h-4 w-20 bg-slate-100 dark:bg-dark-border rounded animate-pulse mt-1" /></div></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">{[1,2,3,4,5].map(i => <SkeletonCard key={i} />)}</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">{[1,2].map(i => <div key={i} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5"><div className="h-4 w-24 bg-slate-200 dark:bg-dark-border rounded animate-pulse mb-3" />{[1,2,3,4,5].map(j => <div key={j} className="h-10 bg-slate-100 dark:bg-dark-border rounded animate-pulse mb-2" />)}</div>)}</div>
      </div>
    );
  }

  const s = data?.stats;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Content Performance</h1>
          <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">{s?.totalPosts || 0} posts analyzed</p>
        </div>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl px-4 py-3">
          <div className="text-xs text-slate-400 mb-1">Overall</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-dark-text">{Math.round(((s?.strong || 0) * 100 + (s?.needsWork || 0) * 50) / Math.max(s?.totalPosts || 1, 1))}/100</div>
        </div>
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> Strong</div>
          <div className="text-2xl font-bold text-green-600">{s?.strong || 0}</div>
        </div>
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1"><AlertTriangle className="w-3 h-3 text-amber-500" /> Needs Work</div>
          <div className="text-2xl font-bold text-amber-600">{s?.needsWork || 0}</div>
        </div>
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1"><AlertCircle className="w-3 h-3 text-red-500" /> Weak</div>
          <div className="text-2xl font-bold text-red-600">{s?.weak || 0}</div>
        </div>
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1"><FileText className="w-3 h-3 text-slate-500" /> Thin Content</div>
          <div className="text-2xl font-bold text-slate-600">{s?.thinContent || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Quick Wins */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-dark-border flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text">Quick Wins</h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-dark-border">
            {data?.quickWins?.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No weak posts to fix</p>
            ) : data?.quickWins?.map(p => (
              <div key={p.slug} className="px-5 py-2.5">
                <a href={`/posts/${p.slug}`} target="_blank" className="text-xs font-medium text-slate-800 dark:text-dark-text hover:text-brand-600 flex items-center gap-1">
                  {p.title} <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                </a>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className={`font-medium ${p.seoScore >= 60 ? 'text-green-500' : p.seoScore >= 40 ? 'text-amber-500' : 'text-red-500'}`}>SEO {p.seoScore}</span>
                  <span>·</span>
                  <span>{p.wordCount.toLocaleString()}w</span>
                  {p.issues.map(iss => <span key={iss} className="px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/20 text-red-500">{iss}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weakest Posts */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:dark-border rounded-xl">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-dark-border flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text">Weakest Posts</h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-dark-border max-h-[480px] overflow-y-auto">
            {data?.published?.filter(p => p.classification === 'weak').slice(0, 20).map(p => (
              <div key={p.slug} className="px-5 py-2.5">
                <a href={`/posts/${p.slug}`} target="_blank" className="text-xs font-medium text-slate-800 dark:text-dark-text hover:text-brand-600 flex items-center gap-1">
                  {p.title} <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                </a>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="font-medium text-red-500">{p.seoScore}</span>
                  <span>·</span>
                  <span>{p.wordCount.toLocaleString()}w</span>
                  {p.issues.slice(0, 2).map(iss => <span key={iss} className="px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/20 text-red-500">{iss}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Latest Report */}
      {data?.latestReport && (
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:dark-border rounded-xl">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-dark-border flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text">Latest Full Report</h2>
            {data?.reports?.[0] && <span className="text-xs text-slate-400 ml-auto">{data.reports[0].file}</span>}
          </div>
          <div className="p-5 max-h-[600px] overflow-y-auto">
            <pre className="text-xs text-slate-600 dark:text-dark-muted leading-relaxed font-mono whitespace-pre-wrap">{data.latestReport}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

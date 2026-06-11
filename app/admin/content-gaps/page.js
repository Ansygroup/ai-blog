'use client';

import { useState, useEffect } from 'react';
import { Crosshair, AlertTriangle, TrendingUp, Tags, Layers } from 'lucide-react';

export default function ContentGapsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/admin/api/content-gaps')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-8 text-center text-slate-500">Analyzing content gaps...</div>;

  if (!data) return <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-8 text-center text-slate-500">Failed to load data.</div>;

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Crosshair className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Content Gaps</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">{data.totalPosts} posts analyzed across {data.categories.length} categories and {data.tagNormalization.totalUnique} tags</p>
      </div>

      {/* Category Distribution */}
      <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-medium text-slate-700 dark:text-dark-muted">Category Distribution</h2>
        </div>
        <div className="space-y-2">
          {data.categories.map((c, i) => {
            const maxCount = data.categories[0].count;
            const pct = Math.round(c.count / maxCount * 100);
            const isLow = c.count <= 3;
            return (
              <div key={c.name} className="flex items-center gap-3">
                <span className="w-28 text-xs font-medium text-slate-700 dark:text-dark-text truncate shrink-0">{c.name}</span>
                <div className="flex-1 bg-slate-100 dark:bg-dark-border rounded-full h-5 relative overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-amber-400' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="w-8 text-xs text-right text-slate-600 dark:text-dark-muted shrink-0">{c.count}</span>
                {c.latestDate > '2026-06-01' && <span className="text-[10px] text-green-600 shrink-0">new</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Critical Gaps */}
      {data.gaps.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-medium text-amber-800 dark:text-amber-300">Underserved Categories</h2>
          </div>
          <div className="space-y-3">
            {data.gaps.map(g => (
              <div key={g.name} className="flex items-start gap-3 bg-white dark:bg-dark-card rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${g.gapLevel === 'critical' ? 'bg-red-100 text-red-700' : g.gapLevel === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {g.gapLevel}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-dark-text">{g.name} — {g.count} posts</div>
                  <p className="text-xs text-slate-500 dark:text-dark-muted mt-0.5">{g.avgWords.toLocaleString()} avg words, last updated {g.latestDate}</p>
                  <p className="text-xs text-slate-600 dark:text-dark-muted mt-1">{g.suggestion}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Topic Gaps */}
      <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-medium text-slate-700 dark:text-dark-muted">Topic Growth Opportunities</h2>
        </div>
        <div className="space-y-3">
          {data.topicGaps.map(t => {
            const pct = Math.round(t.count / t.target * 100);
            return (
              <div key={t.topic} className="border border-slate-200 dark:border-dark-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-900 dark:text-dark-text">{t.topic}</span>
                  <span className="text-xs text-slate-500">{t.count}/{t.target} posts ({pct}%)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-dark-border rounded-full h-2 mb-2">
                  <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <p className="text-xs text-slate-600 dark:text-dark-muted">{t.suggestion}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tag Normalization */}
      <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Tags className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-medium text-slate-700 dark:text-dark-muted">Tag Health</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-50 dark:bg-dark-border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-dark-text">{data.tagNormalization.totalUnique}</div>
            <div className="text-xs text-slate-500">Unique Tags</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{data.tagNormalization.singleUse}</div>
            <div className="text-xs text-slate-500">Used Once ({Math.round(data.tagNormalization.singleUse / data.tagNormalization.totalUnique * 100)}%)</div>
          </div>
        </div>
        <p className="text-xs text-slate-600 dark:text-dark-muted mb-3">{data.tagNormalization.recommendation.tip}</p>
        {data.tagNormalization.recommendation.examples.length > 0 && (
          <div>
            <div className="text-xs text-slate-500 mb-1">Examples of single-use tags:</div>
            <div className="flex flex-wrap gap-1">
              {data.tagNormalization.recommendation.examples.map(t => (
                <span key={t} className="text-xs bg-slate-100 dark:bg-dark-border text-slate-600 dark:text-dark-muted px-2 py-0.5 rounded">{t}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { BarChart3, TrendingUp, FileText, BookOpen, AlertTriangle, CheckCircle, Target, Sparkles, ExternalLink, ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { Skeleton, SkeletonCard } from '@/components/admin/Skeleton';

const TrendChart = dynamic(() => import('@/components/admin/trend-chart'), { ssr: false });

function scoreColor(score) {
  if (!score || score < 40) return 'text-red-600 dark:text-red-400';
  if (score < 70) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
}

function scoreBgColor(score) {
  if (!score || score < 40) return 'bg-red-500';
  if (score < 70) return 'bg-yellow-500';
  return 'bg-green-500';
}

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showWeakest, setShowWeakest] = useState(false);

  useEffect(() => {
    fetch('/admin/api/reports')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const trendData = useMemo(() => {
    if (!data?.scoreTrend) return [];
    return data.scoreTrend.map(t => ({ date: t.date.slice(5), score: t.score, posts: t.totalPosts }));
  }, [data]);

  if (loading) return (
    <div>
      <div className="flex items-center gap-3 mb-6"><BarChart3 className="w-5 h-5 text-slate-300" /><div><div className="h-6 w-32 bg-slate-200 dark:bg-dark-border rounded animate-pulse" /><div className="h-4 w-20 bg-slate-100 dark:bg-dark-border rounded animate-pulse mt-1" /></div></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {[1,2].map(i => <div key={i} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5"><Skeleton className="h-4 w-24 mb-3" />{[1,2,3,4,5].map(j => <Skeleton key={j} className="h-8 w-full mb-2" />)}</div>)}
      </div>
    </div>
  );

  const { latest, latestAnalytics, history } = data || {};
  if (!latest) return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Performance Reports</h1>
        </div>
      </div>
      <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-dark-border p-8 text-center">
        <p className="text-sm text-slate-500 dark:text-dark-muted mb-3">No reports yet</p>
        <p className="text-xs text-slate-400">Run the Content Performance Agent from Mission Control to generate your first report.</p>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'categories', label: 'Categories', icon: TrendingUp },
    { id: 'quick-wins', label: 'Quick Wins', icon: Target },
    { id: 'weakest', label: 'Weakest Posts', icon: AlertTriangle },
  ];

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <div>
            <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Performance Reports</h1>
            <p className="text-sm text-slate-500 dark:text-dark-muted mt-0.5">Content performance analysis · {latest.totalPosts} posts · Score {latest.score}/100</p>
          </div>
        </div>
      </div>

      {/* Score Hero */}
      <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-5 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-500 dark:text-dark-muted uppercase tracking-wider">Traffic Opportunity Score</span>
              <span className="text-[10px] text-slate-400">Latest: {latest.date?.slice(0, 10) || 'N/A'}</span>
            </div>
            <div className={`text-4xl font-bold font-heading ${scoreColor(latest.score)}`}>{latest.score}<span className="text-lg text-slate-400">/100</span></div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{latest.strong || 0}</div>
              <div className="text-slate-500">Strong</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-600">{latest.needsImprovement || 0}</div>
              <div className="text-slate-500">Needs Work</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">{latest.weak || 0}</div>
              <div className="text-slate-500">Weak</div>
            </div>
          </div>
        </div>
        <div className="w-full bg-slate-200 dark:bg-dark-border rounded-full h-2.5 mt-3">
          <div className={`h-2.5 rounded-full transition-all ${scoreBgColor(latest.score)}`} style={{ width: `${latest.score}%` }} />
        </div>
        <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500 dark:text-dark-muted">
          <span>📄 {latest.totalPosts} posts</span>
          <span>📝 {latest.totalWords?.toLocaleString()} words</span>
          <span>📏 Avg {(latest.avgWords || 0).toLocaleString()} w/post</span>
          {latest.thinContent > 0 && <span className="text-red-500">⚠️ {latest.thinContent} thin</span>}
          {latest.withFaq > 0 && <span className="text-green-600">✅ {latest.withFaq} with FAQ</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-brand-600 text-white'
                : 'bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border text-slate-600 dark:text-dark-muted hover:bg-slate-50 dark:hover:bg-dark-border'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {trendData.length > 1 && (
            <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-4">
              <h3 className="text-sm font-medium text-slate-700 dark:text-dark-muted mb-3">Score Trend</h3>
              <TrendChart data={trendData} />
            </div>
          )}

          {latest.actions?.length > 0 && (
            <div className="rounded-xl border border-brand-200 dark:border-brand-800 bg-gradient-to-r from-brand-50 to-indigo-50 dark:from-dark-card dark:to-dark-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text uppercase tracking-wider">Recommended Actions</h2>
              </div>
              <div className="space-y-2">
                {latest.actions.map((action, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0 text-[10px] font-bold text-brand-600 dark:text-brand-400">{i + 1}</span>
                    <span className="text-slate-700 dark:text-dark-muted">{action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {latestAnalytics && (
            <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-4">
              <h3 className="text-sm font-medium text-slate-700 dark:text-dark-muted mb-3">Analytics Snapshot</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 dark:bg-dark-border rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-slate-900 dark:text-dark-text">{latestAnalytics.totalPosts}</div>
                  <div className="text-[10px] text-slate-500">Posts</div>
                </div>
                <div className="bg-slate-50 dark:bg-dark-border rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-slate-900 dark:text-dark-text">{latestAnalytics.seoScore}%</div>
                  <div className="text-[10px] text-slate-500">SEO Readiness</div>
                </div>
                <div className="bg-slate-50 dark:bg-dark-border rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-slate-900 dark:text-dark-text">{latestAnalytics.totalWords?.toLocaleString()}</div>
                  <div className="text-[10px] text-slate-500">Words</div>
                </div>
                <div className="bg-slate-50 dark:bg-dark-border rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-slate-900 dark:text-dark-text">{latestAnalytics.withFaq}</div>
                  <div className="text-[10px] text-slate-500">With FAQ</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'categories' && latest.categories?.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg">
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-dark-muted">Category</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-dark-muted">Posts</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-dark-muted">Strong</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-dark-muted">Needs Work</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-dark-muted">Weak</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-dark-muted">Avg SEO</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-dark-border">
                {latest.categories.map((cat, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-dark-border/50">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-dark-text">{cat.name}</td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-dark-muted">{cat.posts}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${cat.strong > 0 ? 'text-green-600' : 'text-slate-400'}`}>{cat.strong || '-'}</td>
                    <td className="px-4 py-3 text-right text-yellow-600">{cat.needsWork || '-'}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${cat.weak > 0 ? 'text-red-600' : 'text-slate-400'}`}>{cat.weak || '-'}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${scoreColor(cat.avgSeo)}`}>{cat.avgSeo || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="w-16 h-1.5 bg-slate-200 dark:bg-dark-border rounded-full overflow-hidden ml-auto">
                        <div className={`h-full rounded-full ${cat.avgSeo >= 70 ? 'bg-green-500' : cat.avgSeo >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, cat.avgSeo)}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'quick-wins' && (
        <div className="space-y-3">
          {latest.quickWins?.length > 0 ? latest.quickWins.map((win, i) => (
            <div key={i} className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <a href={`/posts/${win.slug}`} target="_blank" className="text-sm font-medium text-slate-900 dark:text-dark-text hover:text-brand-600 inline-flex items-center gap-1">
                    {win.title} <ExternalLink className="w-3 h-3 opacity-40" />
                  </a>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {win.issues.map((issue, j) => (
                      <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">{issue}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )) : <div className="text-sm text-slate-500 dark:text-dark-muted text-center py-8">No quick wins identified</div>}
        </div>
      )}

      {activeTab === 'weakest' && (
        <div className="space-y-3">
          {latest.weakest?.length > 0 ? (
            <>
              <button onClick={() => setShowWeakest(!showWeakest)} className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline mb-2">
                {showWeakest ? 'Hide' : 'Show'} {latest.weakest.length} weakest posts
                {showWeakest ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showWeakest && latest.weakest.map((post, i) => (
                <div key={i} className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-[10px] font-bold text-red-700 dark:text-red-400 shrink-0">{post.score}</span>
                    <div className="flex-1 min-w-0">
                      <a href={`/posts/${post.slug}`} target="_blank" className="text-sm font-medium text-slate-900 dark:text-dark-text hover:text-brand-600 inline-flex items-center gap-1">
                        {post.title} <ExternalLink className="w-3 h-3 opacity-40" />
                      </a>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {post.issues.map((issue, j) => (
                          <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400">{issue}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : <div className="text-sm text-slate-500 dark:text-dark-muted text-center py-8">No weak posts identified</div>}
        </div>
      )}

      {/* History */}
      {history?.length > 1 && (
        <details className="mt-6 group">
          <summary className="text-xs text-slate-500 dark:text-dark-muted cursor-pointer hover:text-slate-700 list-none flex items-center gap-1">
            <FileText className="w-3 h-3" />
            Report History ({history.length} reports)
            <ChevronDown className="w-3 h-3 group-open:rotate-180 transition" />
          </summary>
          <div className="mt-3 space-y-2">
            {history.map((r, i) => (
              <div key={i} className="flex items-center gap-3 text-xs p-2 rounded-lg bg-slate-50 dark:bg-dark-border">
                <span className={`font-semibold ${scoreColor(r.score)}`}>{r.score}/100</span>
                <span className="text-slate-600 dark:text-dark-muted">{r.date?.slice(0, 10)}</span>
                <span className="text-slate-400">{r.totalPosts} posts</span>
                <span className="text-slate-400">{r.strong} strong · {r.needsImprovement} ok · {r.weak} weak</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Search, BarChart3, AlertTriangle, CheckCircle, ExternalLink, Sparkles, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Skeleton, SkeletonCard } from '@/components/admin/Skeleton';

const SeoPieChart = dynamic(() => import('@/components/admin/seo-pie-chart'), { ssr: false });
const SeoBarChart = dynamic(() => import('@/components/admin/seo-bar-chart'), { ssr: false });

const ISSUE_COLORS = {
  critical: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  error: { bg: 'bg-orange-100 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  warning: { bg: 'bg-amber-100 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  info: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
};

const CATEGORY_COLORS = {
  'AI Tools': 'text-blue-600', 'AI News': 'text-emerald-600', Tutorials: 'text-purple-600',
  Reviews: 'text-orange-600', Comparisons: 'text-cyan-600', 'How To': 'text-pink-600',
  'Content Creation': 'text-indigo-600', Guides: 'text-teal-600', News: 'text-rose-600',
};

function seoColor(score) {
  if (!score || score < 40) return 'text-red-600 dark:text-red-400';
  if (score < 60) return 'text-yellow-600 dark:text-yellow-400';
  if (score < 80) return 'text-blue-600 dark:text-blue-400';
  return 'text-green-600 dark:text-green-400';
}

function seoBarColor(score) {
  if (!score || score < 40) return 'bg-red-500';
  if (score < 60) return 'bg-yellow-500';
  if (score < 80) return 'bg-blue-500';
  return 'bg-green-500';
}

export default function SeoGlassDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('seoScore');
  const [sortDir, setSortDir] = useState('asc');
  const [expandedPost, setExpandedPost] = useState(null);

  useEffect(() => {
    fetch('/admin/api/seo?glass=true')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const filteredPosts = useMemo(() => {
    if (!data?.posts) return [];
    let p = [...data.posts];

    if (search) {
      const q = search.toLowerCase();
      p = p.filter(post => (post.title || post.slug).toLowerCase().includes(q));
    }
    if (categoryFilter !== 'all') {
      p = p.filter(post => (post.category || 'Uncategorized') === categoryFilter);
    }
    if (severityFilter !== 'all') {
      p = p.filter(post => post.issues?.some(i => i.severity === severityFilter));
    }

    p.sort((a, b) => {
      const aVal = sortBy === 'seoScore' ? (a.seoScore || 0) : sortBy === 'wordCount' ? (a.wordCount || 0) : (a.title || '').toLowerCase();
      const bVal = sortBy === 'seoScore' ? (b.seoScore || 0) : sortBy === 'wordCount' ? (b.wordCount || 0) : (b.title || '').toLowerCase();
      if (typeof aVal === 'number') return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      return sortDir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });

    return p;
  }, [data, search, categoryFilter, severityFilter, sortBy, sortDir]);

  const categories = useMemo(() => {
    if (!data?.categoryBreakdown) return [];
    return Object.entries(data.categoryBreakdown).sort((a, b) => b[1].total - a[1].total);
  }, [data]);

  const pieData = useMemo(() => {
    if (!data?.distribution) return [];
    const colors = { '0-40': '#ef4444', '40-60': '#eab308', '60-80': '#3b82f6', '80-100': '#22c55e' };
    return Object.entries(data.distribution).map(([name, value]) => ({ name, value, fill: colors[name] || '#94a3b8' }));
  }, [data]);

  if (loading) return (
    <div>
      <div className="flex items-center gap-3 mb-6"><BarChart3 className="w-5 h-5 text-slate-300" /><div><div className="h-6 w-32 bg-slate-200 dark:bg-dark-border rounded animate-pulse" /><div className="h-4 w-20 bg-slate-100 dark:bg-dark-border rounded animate-pulse mt-1" /></div></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {[1,2].map(i => <div key={i} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5"><Skeleton className="h-4 w-24 mb-3" /><Skeleton className="h-48 w-full rounded-lg" /></div>)}
      </div>
      <Skeleton className="h-10 w-full mb-4" />
      <div className="space-y-2">
        {[1,2,3,4,5].map(i => <div key={i} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4"><Skeleton className="h-4 w-3/4 mb-2" /><Skeleton className="h-3 w-full" /></div>)}
      </div>
    </div>
  );

  if (error) return (
    <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-dark-border p-8 text-center">
      <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-red-500" />
      <p className="text-sm text-slate-500 dark:text-dark-muted">{error}</p>
    </div>
  );

  const statsCards = [
    { label: 'Average Score', value: data?.avgScore ?? '—', color: seoColor(data?.avgScore), sub: `Across ${data?.scored || 0} scored posts` },
    { label: 'Strong (80+)', value: data?.strong ?? 0, color: 'text-green-600 dark:text-green-400', sub: `${data?.total ? Math.round((data.strong / data.total) * 100) : 0}% of total`, icon: CheckCircle },
    { label: 'Needs Work (<70)', value: data?.needsImprovement ?? 0, color: 'text-red-600 dark:text-red-400', sub: `${data?.total ? Math.round((data.needsImprovement / data.total) * 100) : 0}% needs attention`, icon: AlertTriangle },
    { label: 'Categories', value: categories.length, color: 'text-brand-600 dark:text-brand-400', sub: `${data?.total || 0} total posts`, icon: BarChart3 },
  ];

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <div>
            <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">SEO Glass Dashboard</h1>
            <p className="text-sm text-slate-500 dark:text-dark-muted mt-0.5">Search engine optimization analysis across all posts</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statsCards.map(({ label, value, color, sub, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-4">
            <div className="flex items-center gap-2 mb-1">
              {Icon && <Icon className={`w-3.5 h-3.5 ${color}`} />}
              <span className="text-xs font-medium text-slate-500 dark:text-dark-muted uppercase tracking-wider">{label}</span>
            </div>
            <div className={`text-2xl font-bold font-heading ${color}`}>{value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-4">
          <h3 className="text-sm font-medium text-slate-700 dark:text-dark-muted mb-3">Score Distribution</h3>
          <SeoPieChart data={pieData} />
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-4">
          <h3 className="text-sm font-medium text-slate-700 dark:text-dark-muted mb-3">Score Range Counts</h3>
          <SeoBarChart data={pieData} />
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-4 mb-6">
        <h3 className="text-sm font-medium text-slate-700 dark:text-dark-muted mb-3">Category Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 dark:text-dark-muted border-b border-slate-200 dark:border-dark-border">
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium text-right">Posts</th>
                <th className="pb-2 font-medium text-right">Avg Score</th>
                <th className="pb-2 font-medium text-right">Weak</th>
                <th className="pb-2 font-medium text-right">Score Bar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-dark-border">
              {categories.map(([cat, stats]) => (
                <tr key={cat} className="hover:bg-slate-50 dark:hover:bg-dark-border/50">
                  <td className="py-2.5 pr-4">
                    <span className={CATEGORY_COLORS[cat] || 'text-slate-700 dark:text-dark-text'}>{cat}</span>
                  </td>
                  <td className="py-2.5 text-right text-slate-600 dark:text-dark-muted">{stats.total}</td>
                  <td className={`py-2.5 text-right font-semibold ${seoColor(stats.avgScore)}`}>{stats.avgScore}</td>
                  <td className="py-2.5 text-right">
                    <span className={stats.weak > 0 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-400'}>{stats.weak}</span>
                  </td>
                  <td className="py-2.5 pl-4">
                    <div className="w-24 h-1.5 bg-slate-200 dark:bg-dark-border rounded-full overflow-hidden ml-auto">
                      <div className={`h-full rounded-full ${seoBarColor(stats.avgScore)}`} style={{ width: `${Math.min(100, (stats.avgScore || 0))}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Summary */}
      {data && (
        <div className="rounded-xl border border-brand-200 dark:border-brand-800 bg-gradient-to-r from-brand-50 to-indigo-50 dark:from-dark-card dark:to-dark-border p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-dark-text uppercase tracking-wider">AI Analysis</h3>
          </div>
          <p className="text-sm text-slate-700 dark:text-dark-muted">
            {data.avgScore < 50
              ? `⚠️ Critical: Average SEO score is ${data.avgScore}. ${data.needsImprovement} posts need immediate attention. Run SEO optimizer across all categories.`
              : data.avgScore < 70
                ? `📈 Average SEO score is ${data.avgScore}. ${data.needsImprovement} posts (${Math.round((data.needsImprovement / data.total) * 100)}%) need improvement. Focus on ${categories.filter(([,s]) => s.avgScore < 60).map(([c]) => c).join(', ') || 'all categories'}.`
                : `✅ Strong average score of ${data.avgScore}. ${data.strong} posts (${Math.round((data.strong / data.total) * 100)}%) are performing well. ${data.needsImprovement} posts could still use optimization.`
            }
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <a href="/admin/seo" className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline">View all SEO data <ExternalLink className="w-3 h-3" /></a>
          </div>
        </div>
      )}

      {/* Filtered Post Table */}
      <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-dark-border">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <h3 className="text-sm font-medium text-slate-700 dark:text-dark-muted">
              Posts Needing Improvement <span className="text-slate-400 font-normal">({filteredPosts.length} of {data?.needsImprovement || 0})</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search posts..."
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-dark-border text-xs bg-white dark:bg-dark-card focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-dark-border text-xs bg-white dark:bg-dark-card">
                <option value="all">All Categories</option>
                {categories.map(([c]) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-dark-border text-xs bg-white dark:bg-dark-card">
                <option value="all">All Severity</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <button onClick={() => { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); setSortBy('seoScore'); }} className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-dark-border text-xs hover:bg-slate-50 dark:hover:bg-dark-border">
                <Filter className="w-3 h-3" /> Sort {sortDir === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {filteredPosts.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-dark-muted">No posts match your filters</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-dark-border">
            {filteredPosts.map(post => (
              <div key={post.slug}>
                <button
                  onClick={() => setExpandedPost(expandedPost === post.slug ? null : post.slug)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-dark-border/50 text-left"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${post.seoScore < 40 ? 'bg-red-500' : post.seoScore < 60 ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-dark-text truncate">{post.title || post.slug}</span>
                      <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-dark-border shrink-0">{post.category || 'Uncategorized'}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {post.issues?.slice(0, 3).map((issue, i) => (
                        <span key={i} className={`text-[10px] inline-flex items-center gap-1 ${ISSUE_COLORS[issue.type]?.text || 'text-slate-500'}`}>
                          <span className={`w-1 h-1 rounded-full ${ISSUE_COLORS[issue.type]?.dot || 'bg-slate-400'}`} />
                          {issue.label}
                        </span>
                      ))}
                      {(post.issues?.length || 0) > 3 && <span className="text-[10px] text-slate-400">+{post.issues.length - 3} more</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-sm font-bold font-mono ${seoColor(post.seoScore)}`}>{post.seoScore ?? '—'}</span>
                    {expandedPost === post.slug ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                  </div>
                </button>

                {expandedPost === post.slug && (
                  <div className="px-4 pb-4 pt-0 bg-slate-50/50 dark:bg-dark-border/20">
                    <div className="ml-5 pl-3 border-l-2 border-slate-200 dark:border-dark-border space-y-3">
                      {/* Issues */}
                      <div>
                        <h4 className="text-[10px] font-semibold text-slate-500 dark:text-dark-muted uppercase tracking-wider mb-1.5">Issues ({post.issues?.length || 0})</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {post.issues?.map((issue, i) => (
                            <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full ${ISSUE_COLORS[issue.type]?.bg || 'bg-slate-100'} ${ISSUE_COLORS[issue.type]?.text || 'text-slate-500'}`}>
                              {issue.label}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Suggested Actions */}
                      {post.suggestedActions?.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-semibold text-slate-500 dark:text-dark-muted uppercase tracking-wider mb-1.5">Suggested Fixes</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {post.suggestedActions.map((action, i) => (
                              <code key={i} className="text-[10px] px-2 py-0.5 rounded bg-brand-100 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 font-mono">
                                {action}
                              </code>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Meta */}
                      <div className="flex flex-wrap gap-3 text-[10px] text-slate-400">
                        {post.wordCount && <span>{post.wordCount.toLocaleString()} words</span>}
                        {post.date && <span>{new Date(post.date).toLocaleDateString()}</span>}
                        <a href={`/posts/${post.slug}`} target="_blank" className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:underline">
                          View post <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

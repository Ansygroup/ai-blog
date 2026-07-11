'use client';

import { useState, useEffect } from 'react';
import { Calendar, Sparkles, Target, Clock, BookOpen, Layers, ChevronLeft, ChevronRight, FileText, Zap, TrendingUp } from 'lucide-react';
import { Skeleton, SkeletonCard } from '@/components/admin/Skeleton';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const CATEGORY_COLORS = {
  'AI Tools': 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20',
  Tutorials: 'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
  Reviews: 'border-l-amber-500 bg-amber-50 dark:bg-amber-900/20',
  Comparisons: 'border-l-purple-500 bg-purple-50 dark:bg-purple-900/20',
  'AI News': 'border-l-rose-500 bg-rose-50 dark:bg-rose-900/20',
  'Best Of': 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
  'How To': 'border-l-cyan-500 bg-cyan-50 dark:bg-cyan-900/20',
  Guides: 'border-l-teal-500 bg-teal-50 dark:bg-teal-900/20',
  'AI Agents': 'border-l-indigo-500 bg-indigo-50 dark:bg-indigo-900/20',
};

function catBorder(cat) {
  return CATEGORY_COLORS[cat] || 'border-l-slate-400 bg-slate-50 dark:bg-dark-border';
}

function trafficColor(t) {
  if (t === 'high') return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20';
  if (t === 'medium') return 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/20';
  return 'text-slate-500 dark:text-dark-muted bg-slate-100 dark:bg-dark-border';
}

export default function ContentPlanPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeWeek, setActiveWeek] = useState(0);

  useEffect(() => {
    fetch('/admin/api/content-plan')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div>
      <div className="flex items-center gap-3 mb-6"><Calendar className="w-5 h-5 text-slate-300" /><div><div className="h-6 w-36 bg-slate-200 dark:bg-dark-border rounded animate-pulse" /><div className="h-4 w-20 bg-slate-100 dark:bg-dark-border rounded animate-pulse mt-1" /></div></div>
      <div className="space-y-3">
        {[1,2,3,4,5].map(i => <div key={i} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4"><Skeleton className="h-4 w-48 mb-2" /><Skeleton className="h-3 w-full mb-1" /><Skeleton className="h-3 w-3/4" /></div>)}
      </div>
    </div>
  );

  if (!data?.plan?.weeks) return (
    <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-dark-border p-8 text-center">
      <p className="text-sm text-slate-500 dark:text-dark-muted">Could not generate content plan. Check your Groq API key.</p>
    </div>
  );

  const { plan, stats } = data;
  const week = plan.weeks[activeWeek];

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <div>
            <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Content Calendar</h1>
            <p className="text-sm text-slate-500 dark:text-dark-muted mt-0.5">AI-generated 4-week content plan</p>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="rounded-xl border border-brand-200 dark:border-brand-800 bg-gradient-to-r from-brand-50 to-indigo-50 dark:from-dark-card dark:to-dark-border p-5 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text uppercase tracking-wider">{plan.planTitle || 'Content Strategy'}</h2>
          <span className="text-[10px] bg-brand-600 text-white px-1.5 py-0.5 rounded font-medium">AI GENERATED</span>
        </div>
        <p className="text-sm text-slate-700 dark:text-dark-muted">{plan.strategy}</p>
        <div className="flex flex-wrap gap-4 mt-3">
          {[
            { label: 'Total Posts', value: stats?.totalPosts || 0, icon: FileText },
            { label: 'Total Words', value: `${((stats?.totalWords || 0) / 1000).toFixed(0)}k`, icon: BookOpen },
            { label: 'Categories', value: stats?.categories || 0, icon: Layers },
            { label: 'Weak SEO', value: stats?.weakSeo || 0, icon: Target },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs">
              <Icon className="w-3 h-3 text-slate-400" />
              <span className="text-slate-500 dark:text-dark-muted">{label}:</span>
              <span className="font-semibold text-slate-800 dark:text-dark-text">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center gap-2 mb-4">
        {plan.weeks.map((w, i) => (
          <button
            key={i}
            onClick={() => setActiveWeek(i)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition ${
              i === activeWeek
                ? 'bg-brand-600 text-white'
                : 'bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border text-slate-600 dark:text-dark-muted hover:bg-slate-50 dark:hover:bg-dark-border'
            }`}
          >
            Week {i + 1}: {w.theme?.slice(0, 20)}{w.theme?.length > 20 ? '...' : ''}
          </button>
        ))}
      </div>

      {week && (
        <div>
          {/* Week Header */}
          <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-heading font-bold text-slate-900 dark:text-dark-text">Week {week.week}: {week.theme}</h2>
                <p className="text-xs text-slate-500 dark:text-dark-muted mt-0.5">{week.focus} — {week.posts?.length || 0} planned posts</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-dark-border px-2 py-1 rounded-full">
                  {week.posts?.reduce((s, p) => s + (p.targetLength || 0), 0).toLocaleString()} planned words
                </span>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {week.posts?.map((post, i) => (
              <div key={i} className={`rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-4 hover:shadow-sm transition ${catBorder(post.category)}`} style={{ borderLeftWidth: '3px' }}>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-dark-text leading-snug">{post.title}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-dark-border text-slate-600 dark:text-dark-muted font-medium">
                        {post.category || 'General'}
                      </span>
                      {post.targetLength && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <BookOpen className="w-2.5 h-2.5" />
                          {(post.targetLength / 1000).toFixed(1)}k words
                        </span>
                      )}
                      {post.trafficPotential && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${trafficColor(post.trafficPotential)}`}>
                          {post.trafficPotential.toUpperCase()}
                        </span>
                      )}
                    </div>
                    {post.description && (
                      <p className="text-xs text-slate-500 dark:text-dark-muted mt-2 line-clamp-2">{post.description}</p>
                    )}
                    {post.keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {post.keywords.map((kw, j) => (
                          <code key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-dark-border text-slate-500 dark:text-dark-muted font-mono">{kw}</code>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="mt-6 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-4">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-dark-muted uppercase tracking-wider mb-3">Plan Summary — {plan.weeks.length} Weeks</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {plan.weeks.map((w, i) => {
            const totalLen = w.posts?.reduce((s, p) => s + (p.targetLength || 0), 0) || 0;
            const highTraffic = w.posts?.filter(p => p.trafficPotential === 'high').length || 0;
            return (
              <div key={i} className="rounded-lg bg-slate-50 dark:bg-dark-border p-3">
                <div className="text-xs font-semibold text-slate-900 dark:text-dark-text">Week {w.week}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{w.posts?.length || 0} posts · {(totalLen / 1000).toFixed(0)}k words</div>
                <div className="text-[10px] text-green-600 dark:text-green-400">{highTraffic} high-traffic</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

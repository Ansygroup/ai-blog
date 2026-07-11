'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, BookOpen, Link2, Hash, FileText, CalendarDays, Lightbulb, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';

const CAT_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'];
const SEO_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e'];

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color || 'text-slate-500'}`} />
        <span className="text-xs font-medium text-slate-500 dark:text-dark-muted">{label}</span>
      </div>
      <div className="text-2xl font-bold font-heading text-slate-900 dark:text-dark-text">{value}</div>
      {sub && <div className="text-xs text-slate-400 dark:text-dark-muted mt-1">{sub}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/admin/api/stats').then(r => r.json()),
      fetch('/admin/api/content-gaps').then(r => r.json()),
      fetch('/admin/api/stats?insights=true').then(r => r.json()).catch(() => ({ insights: null, generated: false })),
    ]).then(([stats, gaps, ai]) => {
      setData({ stats, gaps });
      setInsights(ai.insights);
      setInsightsLoading(false);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-8 text-center text-slate-500">Loading analytics...</div>;
  if (!data) return <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-8 text-center text-slate-500">Failed to load.</div>;

  const { stats, gaps } = data;

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Analytics</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">Site-wide content metrics and trends</p>
      </div>

      {/* AI Insights */}
      {insightsLoading && (
        <div className="rounded-xl border border-brand-200 dark:border-brand-800 bg-gradient-to-r from-brand-50 to-indigo-50 dark:from-dark-card dark:to-dark-border p-5 mb-6 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
          <p className="text-sm text-brand-700 dark:text-brand-300">Generating AI insights...</p>
        </div>
      )}
      {insights && !insightsLoading && (
        <div className="rounded-xl border border-brand-200 dark:border-brand-800 bg-gradient-to-r from-brand-50 to-indigo-50 dark:from-dark-card dark:to-dark-border p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text uppercase tracking-wider">AI Insights</h2>
            <span className="text-[10px] bg-brand-600 text-white px-1.5 py-0.5 rounded font-medium">LIVE</span>
          </div>
          <p className="text-sm text-slate-700 dark:text-dark-muted mb-3 leading-relaxed">{insights.summary}</p>
          <div className="space-y-2">
            {insights.insights?.map((insight, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-slate-800 dark:text-dark-text">{insight.title}:</span>{' '}
                  <span className="text-slate-600 dark:text-dark-muted">{insight.description}</span>
                </div>
                <a href={insight.actionUrl} className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:underline shrink-0 text-xs font-medium">
                  {insight.action} <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={FileText} label="Published" value={stats.posts.published} sub={`${stats.posts.total} total`} color="text-blue-500" />
        <StatCard icon={BookOpen} label="Total Words" value={(stats.words.total / 1000).toFixed(1) + 'k'} sub={`Avg ${stats.words.avg}/post`} color="text-indigo-500" />
        <StatCard icon={Hash} label="SEO Score" value={stats.seo.avgScore} sub={`${stats.seo.needsImprovement} below 70`} color={stats.seo.avgScore >= 70 ? 'text-green-500' : 'text-amber-500'} />
        <StatCard icon={Link2} label="Internal Links" value={stats.links.total} sub={`Avg ${stats.links.avgPerPost}/post`} color="text-purple-500" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Publishing Activity Line Chart */}
        <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-medium text-slate-700 dark:text-dark-muted">Posts Published per Month</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.charts?.monthly?.slice(-18) || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={m => m.slice(5)} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value, name) => [value, 'Posts']}
                  labelFormatter={l => l}
                />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SEO Distribution Pie Chart */}
        <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Hash className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-medium text-slate-700 dark:text-dark-muted">SEO Score Distribution</h2>
          </div>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie data={stats.charts?.seoDistribution || []} dataKey="count" nameKey="range" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2}>
                  {(stats.charts?.seoDistribution || []).map((entry, i) => (
                    <Cell key={entry.range} fill={SEO_COLORS[i % SEO_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 text-xs">
              {(stats.charts?.seoDistribution || []).map((entry, i) => (
                <div key={entry.range} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: SEO_COLORS[i] }} />
                  <span className="text-slate-600 dark:text-dark-muted">{entry.range}</span>
                  <span className="font-medium text-slate-900 dark:text-dark-text">{entry.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Publishing Activity stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Today', value: stats.posts.today, color: 'text-blue-500' },
          { label: 'This Week', value: stats.posts.thisWeek, color: 'text-indigo-500' },
          { label: 'This Month', value: stats.posts.thisMonth, color: 'text-purple-500' },
        ].map(item => (
          <div key={item.label} className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-4 text-center">
            <div className="text-3xl font-bold font-heading text-slate-900 dark:text-dark-text">{item.value}</div>
            <div className="text-xs text-slate-500 mt-1">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Category Distribution Bar Chart */}
      <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-medium text-slate-700 dark:text-dark-muted">Content Distribution by Category</h2>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.charts?.categories || []} layout="vertical" margin={{ left: 100, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" width={90} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                formatter={(value, name) => [value, 'Posts']}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {(stats.charts?.categories || []).map((entry, i) => (
                  <Cell key={entry.name} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Queue + SEO Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-6">
          <h2 className="text-xs font-medium text-slate-500 dark:text-dark-muted mb-3 uppercase tracking-wider">Queue Status</h2>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold font-heading text-slate-900 dark:text-dark-text">{stats.queue.total}</div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stats.queue.status === 'full' ? 'bg-green-100 text-green-700' : stats.queue.status === 'healthy' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
              {stats.queue.status}
            </span>
          </div>
          <div className="mt-2 w-full bg-slate-100 dark:bg-dark-border rounded-full h-2">
            <div className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.min((stats.queue.total / 30) * 100, 100)}%` }} />
          </div>
          <p className="text-xs text-slate-400 mt-2">Keywords in queue (target: 30+)</p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-6">
          <h2 className="text-xs font-medium text-slate-500 dark:text-dark-muted mb-3 uppercase tracking-wider">SEO Health</h2>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold font-heading text-slate-900 dark:text-dark-text">{stats.seo.scored}</div>
            <span className="text-xs text-slate-500">scored posts</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 bg-slate-100 dark:bg-dark-border rounded-full h-2">
              <div className="h-2 rounded-full bg-green-500" style={{ width: `${Math.min(((stats.seo.scored - stats.seo.needsImprovement) / stats.seo.scored) * 100, 100)}%` }} />
            </div>
            <span className="text-xs text-slate-500">{stats.seo.needsImprovement} need work</span>
          </div>
        </div>
      </div>

      {/* Tag overview */}
      <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-6">
        <h2 className="text-xs font-medium text-slate-500 dark:text-dark-muted mb-3 uppercase tracking-wider">Tag Overview</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-slate-50 dark:bg-dark-border rounded-lg">
            <div className="text-2xl font-bold font-heading text-slate-900 dark:text-dark-text">{gaps.tagNormalization.totalUnique}</div>
            <div className="text-xs text-slate-500">Unique Tags</div>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-2xl font-bold font-heading text-red-600">{gaps.tagNormalization.singleUse}</div>
            <div className="text-xs text-slate-500">Used Only Once</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {gaps.tags.slice(0, 10).map(t => (
            <span key={t.name} className="text-xs bg-slate-100 dark:bg-dark-border text-slate-600 dark:text-dark-muted px-2 py-0.5 rounded">#{t.name} ({t.count})</span>
          ))}
        </div>
      </div>
    </div>
  );
}

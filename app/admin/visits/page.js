'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Eye, TrendingUp, Users, Globe, ExternalLink, RefreshCw, Loader2, BarChart3, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { SkeletonCard, Skeleton } from '@/components/admin/Skeleton';

const RANGES = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

export default function VisitsPage() {
  const toast = useToast();
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  async function fetchStats() {
    setLoading(true);
    try {
      const res = await fetch(`/admin/api/visits?days=${days}`);
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setData(d);
    } catch (err) {
      toast.error(`Failed to load: ${err.message}`);
    }
    setLoading(false);
  }

  useEffect(() => { fetchStats(); }, [days]);

  async function handleReset() {
    if (!confirm('Reset all visit data? This cannot be undone.')) return;
    setResetting(true);
    try {
      const res = await fetch('/admin/api/visits', { method: 'DELETE' });
      const d = await res.json();
      if (d.success) {
        toast.success('Visit data reset');
        fetchStats();
      } else {
        throw new Error('Reset failed');
      }
    } catch (err) {
      toast.error(err.message);
    }
    setResetting(false);
  }

  const total = data?.total || 0;
  const today = data?.today || 0;

  if (loading && !data) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-dark-border animate-pulse" />
            <div>
              <div className="h-6 w-44 bg-slate-200 dark:bg-dark-border rounded animate-pulse" />
              <div className="h-4 w-64 bg-slate-100 dark:bg-dark-border rounded animate-pulse mt-1" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-5 mb-6">
          <Skeleton className="h-4 w-36 mb-4" />
          <div className="h-[280px] flex items-end gap-1 px-2">
            {Array.from({ length: days > 7 ? 30 : 7 }).map((_, i) => (
              <div key={i} className="flex-1 bg-slate-100 dark:bg-dark-border rounded-t animate-pulse" style={{ height: `${20 + Math.random() * 60}%` }} />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-5">
            <Skeleton className="h-4 w-24 mb-4" />
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-5 w-full mb-2" />)}
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-5">
            <Skeleton className="h-4 w-24 mb-4" />
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-7 w-full mb-2" />)}
          </div>
        </div>
      </div>
    );
  }

  const week = data?.thisWeek || 0;
  const month = data?.thisMonth || 0;
  const unique = data?.totalUnique || 0;
  const peak = data?.daily?.reduce((m, d) => d.count > m.count ? d : m, { count: 0, date: '-' });
  const avg = data?.daily?.length ? Math.round(data.daily.reduce((s, d) => s + d.count, 0) / data.daily.length) : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Eye className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Visitor Analytics</h1>
            <p className="text-sm text-slate-500 dark:text-dark-muted">Self-hosted pageview tracking · 30-min session window</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-dark-border overflow-hidden">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setDays(r.days)}
                className={`px-3 py-1.5 text-sm font-medium transition ${
                  days === r.days
                    ? 'bg-brand-600 text-white'
                    : 'bg-white dark:bg-dark-card text-slate-600 dark:text-dark-muted hover:bg-slate-50 dark:hover:bg-dark-border'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-dark-border text-sm font-medium text-slate-600 dark:text-dark-muted hover:bg-slate-50 dark:hover:bg-dark-border disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
          >
            {resetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Reset
          </button>
        </div>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Eye} label="Today" value={today} accent="text-cyan-500" sub={today === 0 ? 'No visits yet' : `${avg > 0 ? Math.round(today / avg * 100) : 0}% of avg`} />
        <StatCard icon={Calendar} label="This Week" value={week} accent="text-blue-500" sub={`${avg > 0 ? Math.round(week / (avg * 7) * 100) : 0}% of expected`} />
        <StatCard icon={TrendingUp} label="This Month" value={month} accent="text-indigo-500" sub={`${(month / 30).toFixed(1)}/day`} />
        <StatCard icon={Users} label="Unique Sessions" value={unique} accent="text-violet-500" sub={`${total > 0 ? Math.round(unique / total * 100) : 0}% of total`} />
      </div>

      {/* Daily chart */}
      <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text uppercase tracking-wider">Daily Pageviews</h2>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>Peak: <strong className="text-slate-700 dark:text-dark-text">{peak.count}</strong> on {peak.date}</span>
            <span>Avg: <strong className="text-slate-700 dark:text-dark-text">{avg}/day</strong></span>
          </div>
        </div>
        {loading ? (
          <div className="h-[280px] flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data?.daily || []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={(v) => v.slice(5)}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#cbd5e1' }}
                itemStyle={{ color: '#67e8f9' }}
                formatter={(v) => [`${v} visits`, 'Pageviews']}
              />
              <Line type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} dot={{ r: 2, fill: '#06b6d4' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top pages */}
        <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text uppercase tracking-wider">Top Pages</h2>
          </div>
          {data?.topPages?.length ? (
            <div className="space-y-1">
              {data.topPages.map((p, i) => (
                <div key={p.path} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-slate-50 dark:hover:bg-dark-border text-sm">
                  <span className="w-5 text-xs font-bold text-slate-400">#{i + 1}</span>
                  <a href={p.path} target="_blank" className="flex-1 min-w-0 truncate font-mono text-xs text-slate-700 dark:text-dark-text hover:text-brand-600 dark:hover:text-brand-400">
                    {p.path}
                  </a>
                  <span className="text-xs font-semibold text-slate-500 dark:text-dark-muted tabular-nums shrink-0">
                    {p.total}
                    <span className="text-slate-400 font-normal"> ({p.unique}u)</span>
                  </span>
                  <a href={p.path} target="_blank" className="text-slate-300 hover:text-slate-500 shrink-0">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-6">No page data yet</p>
          )}
        </div>

        {/* Top referrers */}
        <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <ExternalLink className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text uppercase tracking-wider">Top Referrers</h2>
          </div>
          {data?.topReferrers?.length ? (
            <div className="space-y-1">
              {data.topReferrers.map((r, i) => {
                const pct = total > 0 ? (r.count / total * 100) : 0;
                return (
                  <div key={r.domain} className="py-1.5 px-2 rounded hover:bg-slate-50 dark:hover:bg-dark-border text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-xs font-bold text-slate-400">#{i + 1}</span>
                      <span className="flex-1 truncate text-slate-700 dark:text-dark-text">{r.domain}</span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-dark-muted tabular-nums shrink-0">
                        {r.count} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="ml-7 mt-1 h-1 bg-slate-100 dark:bg-dark-border rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-6">No referrer data yet</p>
          )}
        </div>
      </div>

      {/* Info banner */}
      <div className="mt-6 rounded-lg border border-dashed border-slate-300 dark:border-dark-border p-4 text-xs text-slate-500 dark:text-dark-muted">
        <strong>How it works:</strong> The <code className="px-1 py-0.5 bg-slate-100 dark:bg-dark-border rounded text-[11px]">/api/track</code> endpoint receives a ping on each public page load. Bots (by User-Agent) and admin/api paths are excluded. Same IP+path is counted once per 30 minutes. Data stored in <code className="px-1 py-0.5 bg-slate-100 dark:bg-dark-border rounded text-[11px]">public/data/visits.json</code>.
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${accent}`} />
        <span className="text-xs font-medium text-slate-500 dark:text-dark-muted uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold font-heading tabular-nums text-slate-900 dark:text-dark-text">{value.toLocaleString()}</div>
      <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
    </div>
  );
}

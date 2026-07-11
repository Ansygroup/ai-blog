'use client';

import { useState } from 'react';
import { Activity, CheckCircle2, XCircle, AlertTriangle, Info, RefreshCw, Search } from 'lucide-react';
import { Skeleton } from '@/components/admin/Skeleton';

export default function SiteHealthPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  async function runCheck() {
    setLoading(true);
    setData(null);
    try {
      const res = await fetch('/admin/api/site-health');
      const d = await res.json();
      setData(d);
    } catch {}
    setLoading(false);
  }

  const filtered = data?.issues?.filter(i => filter === 'all' || i.type === filter) || [];
  const iconMap = {
    error: <XCircle className="w-4 h-4 text-red-500 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />,
    info: <Info className="w-4 h-4 text-blue-500 shrink-0" />,
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Activity className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Site Health</h1>
          <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">Diagnostic check for configuration issues</p>
        </div>
      </div>

      {!data && !loading && (
        <div className="text-center py-20">
          <Activity className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p className="text-sm text-slate-500 mb-4">Run a health check to find issues across all posts</p>
          <button onClick={runCheck} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition">
            <Search className="w-4 h-4" />
            Run Health Check
          </button>
        </div>
      )}

      {loading && (
        <div>
          <div className="flex items-center gap-3 mb-6"><Activity className="w-5 h-5 text-slate-300" /><div><Skeleton className="h-4 w-24" /></div></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">{[1,2,3,4].map(i => <div key={i} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4"><Skeleton className="h-8 w-16 mb-1" /><Skeleton className="h-3 w-20" /></div>)}</div>
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5">
            <Skeleton className="h-4 w-32 mb-3" />
            {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="flex items-center gap-3 mb-2"><Skeleton className="w-4 h-4 rounded-full" /><Skeleton className="h-4 flex-1" /></div>)}
          </div>
        </div>
      )}

      {data && !loading && (
        <div>
          {/* Summary */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1"><Activity className="w-3 h-3" /> Overall</div>
              <div className={`text-2xl font-bold ${data.healthy ? 'text-green-600' : 'text-red-600'}`}>
                {data.healthy ? '✅ Healthy' : '⚠️ Issues'}
              </div>
            </div>
            <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4">
              <div className="text-2xl font-bold text-slate-900 dark:text-dark-text">{data.summary.total}</div>
              <div className="text-xs text-slate-500">Total Issues</div>
            </div>
            <div className="bg-white dark:bg-dark-card border border-red-200 dark:border-red-900/30 rounded-xl p-4">
              <div className="text-2xl font-bold text-red-600">{data.summary.errors}</div>
              <div className="text-xs text-slate-500">Errors</div>
            </div>
            <div className="bg-white dark:bg-dark-card border border-amber-200 dark:border-amber-900/30 rounded-xl p-4">
              <div className="text-2xl font-bold text-amber-600">{data.summary.warnings}</div>
              <div className="text-xs text-slate-500">Warnings</div>
            </div>
            <div className="bg-white dark:bg-dark-card border border-blue-200 dark:border-blue-900/30 rounded-xl p-4">
              <div className="text-2xl font-bold text-blue-600">{data.summary.infos}</div>
              <div className="text-xs text-slate-500">Info</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === 'all' ? 'bg-slate-200 text-slate-800 dark:bg-dark-border dark:text-dark-text' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>All ({data.issues.length})</button>
            <button onClick={() => setFilter('error')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>Errors ({data.summary.errors})</button>
            <button onClick={() => setFilter('warning')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>Warnings ({data.summary.warnings})</button>
            <button onClick={() => setFilter('info')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === 'info' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>Info ({data.summary.infos})</button>
            <button onClick={runCheck} className="ml-auto px-3 py-1.5 rounded-lg border border-slate-200 dark:border-dark-border text-xs text-slate-500 hover:bg-slate-50 transition flex items-center gap-1.5"><RefreshCw className="w-3 h-3" /> Recheck</button>
          </div>

          {/* Issues list */}
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl divide-y divide-slate-100 dark:divide-dark-border">
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-400">No {filter !== 'all' ? filter : ''} issues found</div>
            )}
            {filtered.map((issue, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                {iconMap[issue.type]}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded uppercase ${
                      issue.type === 'error' ? 'bg-red-100 text-red-700' : issue.type === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>{issue.type}</span>
                    <span className="text-xs font-mono text-slate-500 dark:text-dark-muted">{issue.file}</span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-dark-text mt-0.5">{issue.msg}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-4 text-xs text-slate-400">
            Checked {data.stats.posts} posts, {data.stats.images} images
          </div>
        </div>
      )}
    </div>
  );
}

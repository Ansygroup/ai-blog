'use client';

import { useState, useEffect } from 'react';
import { Play, CheckCircle2, XCircle, Clock, Loader2, ExternalLink, User, GitBranch, RefreshCw, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/admin/Skeleton';

const statusColors = {
  completed: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', icon: CheckCircle2 },
  failure: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', icon: XCircle },
  cancelled: { bg: 'bg-slate-100 dark:bg-dark-border', text: 'text-slate-500 dark:text-dark-muted', icon: XCircle },
  in_progress: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', icon: Loader2 },
  queued: { bg: 'bg-amber-100 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', icon: Clock },
  pending: { bg: 'bg-amber-100 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', icon: Clock },
};

function timeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function WorkflowsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchRuns() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/admin/api/workflows');
      const d = await res.json();
      if (d.error) setError(d.error);
      else setData(d);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { fetchRuns(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Play className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <div>
            <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Workflow Runs</h1>
            <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">Recent GitHub Actions workflow runs</p>
          </div>
        </div>
        <button
          onClick={fetchRuns}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-dark-border text-sm font-medium text-slate-600 dark:text-dark-muted hover:bg-slate-50 dark:hover:bg-dark-border disabled:opacity-50 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4"><div className="flex items-center gap-3"><Skeleton className="w-8 h-8 rounded-full" /><div className="flex-1"><Skeleton className="h-4 w-48 mb-1" /><Skeleton className="h-3 w-32" /></div><Skeleton className="h-6 w-20 rounded-full" /></div></div>)}
        </div>
      ) : !data || data.runs.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Play className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No workflow runs found.</p>
          <p className="text-xs text-slate-400 mt-1">GitHub Actions runs will appear here after you trigger actions from Mission Control.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.runs.map(r => {
            const sc = statusColors[r.conclusion || r.status] || statusColors.pending;
            const Icon = sc.icon;
            return (
              <a
                key={r.id}
                href={r.htmlUrl}
                target="_blank"
                rel="noopener"
                className="block bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4 hover:bg-slate-50 dark:hover:bg-dark-border transition"
              >
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${sc.text} ${r.status === 'in_progress' ? 'animate-spin' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-slate-900 dark:text-dark-text truncate">{r.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${sc.bg} ${sc.text} shrink-0`}>
                        {r.conclusion || r.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-dark-muted flex-wrap">
                      <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />{r.branch}</span>
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{r.actor}</span>
                      <span>{timeAgo(r.created)}</span>
                      {r.status === 'completed' && <span>took {Math.round((new Date(r.updated) - new Date(r.created)) / 1000)}s</span>}
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

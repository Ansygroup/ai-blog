'use client';

import { useState } from 'react';
import { RotateCcw, ExternalLink } from 'lucide-react';

const stateColors = {
  READY: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  BUILDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  QUEUED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ERROR: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  CANCELED: 'bg-slate-100 text-slate-500 dark:bg-dark-border dark:text-dark-muted',
};

function timeAgo(ts) {
  if (!ts) return '';
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function DeployList({ deployments, loading, onDeploy, error }) {
  const [triggering, setTriggering] = useState(false);

  async function handleDeploy() {
    setTriggering(true);
    try {
      await onDeploy();
    } catch (err) {
      console.error(err);
    }
    setTriggering(false);
  }

  if (error) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-dark-border p-8 text-center">
        <p className="text-sm text-slate-500 dark:text-dark-muted mb-3">{error}</p>
        <small className="text-xs text-slate-400">Set VERCEL_API_TOKEN in env</small>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500 dark:text-dark-muted">
          Last {deployments?.length || 0} deployments
        </span>
        <button
          onClick={handleDeploy}
          disabled={triggering}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          <RotateCcw className={`w-4 h-4 ${triggering ? 'animate-spin' : ''}`} />
          {triggering ? 'Deploying...' : 'Trigger Deploy'}
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white dark:bg-dark-card dark:border-dark-border divide-y divide-slate-100 dark:divide-dark-border">
        {(deployments || []).map((d, i) => (
          <div key={d.uid || d.url || i} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-dark-border/50">
            <div className="flex items-center gap-3 min-w-0">
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${stateColors[d.readyState] || 'bg-slate-100 text-slate-700'}`}>
                {d.readyState || 'UNKNOWN'}
              </span>
              <span className="text-sm text-slate-900 dark:text-dark-text truncate">{d.url || '—'}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-slate-400">{timeAgo(d.createdAt)}</span>
              {d.target === 'production' && (
                <span className="text-xs font-medium text-brand-600 dark:text-brand-400">production</span>
              )}
              <a href={d.inspectorUrl} target="_blank" className="text-slate-400 hover:text-slate-600 dark:hover:text-dark-text">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
        {(!deployments || deployments.length === 0) && (
          <div className="p-8 text-center text-slate-500 dark:text-dark-muted text-sm">
            No deployments found
          </div>
        )}
      </div>
    </div>
  );
}

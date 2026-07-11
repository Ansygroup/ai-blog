'use client';

import { useState, useEffect } from 'react';
import { Clock, Activity, CalendarDays, Send, CheckCircle2, Lightbulb, Archive, XCircle, Trash2, Database } from 'lucide-react';
import { Skeleton } from '@/components/admin/Skeleton';

const icons = {
  'schedule': CalendarDays,
  'unschedule': XCircle,
  'publish': CheckCircle2,
  'add-idea': Lightbulb,
  'delete-idea': Trash2,
  'save-backup': Database,
};

const colors = {
  'schedule': 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
  'unschedule': 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
  'publish': 'text-green-500 bg-green-50 dark:bg-green-900/20',
  'add-idea': 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
  'delete-idea': 'text-red-500 bg-red-50 dark:bg-red-900/20',
  'save-backup': 'text-cyan-500 bg-cyan-50 dark:bg-cyan-900/20',
};

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/admin/api/activity')
      .then(r => r.json())
      .then(d => { setLogs(d.logs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function label(a) {
    const d = a.details || {};
    switch (a.action) {
      case 'schedule': return `Scheduled "${d.slug}" for ${d.date ? new Date(d.date).toLocaleDateString() : '?'}`;
      case 'unschedule': return `Unscheduled "${d.slug}"`;
      case 'publish': return `Published "${d.slug}"`;
      case 'add-idea': return `Added idea: "${d.title}"`;
      case 'delete-idea': return `Deleted idea: "${d.title}"`;
      case 'save-backup': return `Saved backup: ${d.fileName} (${d.totalPosts} posts)`;
      default: return a.action;
    }
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6"><Activity className="w-5 h-5 text-slate-300" /><div><div className="h-6 w-32 bg-slate-200 dark:bg-dark-border rounded animate-pulse" /><div className="h-4 w-20 bg-slate-100 dark:bg-dark-border rounded animate-pulse mt-1" /></div></div>
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl divide-y divide-slate-100 dark:divide-dark-border">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="px-5 py-3 flex items-start gap-3">
              <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4 mb-1" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Activity className="w-5 h-5 text-brand-600" />
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Activity Log</h1>
          <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">{logs.length} recent actions</p>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl">
        {logs.length === 0 ? (
          <p className="text-xs text-slate-400 py-8 text-center">No activity recorded yet. Actions will appear here as you use the admin tools.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-dark-border">
            {logs.map(l => {
              const Icon = icons[l.action] || Activity;
              const c = colors[l.action] || 'text-slate-500 bg-slate-50';
              return (
                <div key={l.id} className="px-5 py-3 flex items-start gap-3">
                  <div className={`p-1.5 rounded-lg shrink-0 ${c}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800 dark:text-dark-text">{label(l)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(l.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

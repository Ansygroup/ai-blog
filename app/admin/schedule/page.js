'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Send, XCircle, CheckCircle2, AlertCircle, CalendarDays, FileText, Eye, ToggleLeft } from 'lucide-react';
import { Skeleton, SkeletonTable } from '@/components/admin/Skeleton';

export default function SchedulePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/admin/api/schedule');
      setData(await res.json());
    } catch {}
    setLoading(false);
  }

  async function handleSchedule(slug) {
    setActionLoading(slug);
    setMessage('');
    const date = new Date();
    date.setDate(date.getDate() + 3);
    date.setHours(9, 0, 0, 0);
    const scheduledDate = date.toISOString().slice(0, 16);
    try {
      const res = await fetch('/admin/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, scheduledDate, action: 'schedule' }),
      });
      const d = await res.json();
      if (d.success) { setMessage(`✅ "${slug}" scheduled for ${new Date(scheduledDate).toLocaleDateString()}`); load(); }
    } catch {}
    setActionLoading('');
  }

  async function handleUnschedule(slug) {
    setActionLoading(slug);
    setMessage('');
    try {
      await fetch('/admin/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, action: 'unschedule' }),
      });
      setMessage(`🗑️ "${slug}" unscheduled`); load();
    } catch {}
    setActionLoading('');
  }

  async function handlePublish(slug) {
    setActionLoading(slug);
    setMessage('');
    try {
      const res = await fetch('/admin/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, action: 'publish' }),
      });
      const d = await res.json();
      if (d.success) { setMessage(`✅ ${d.message}`); load(); }
    } catch {}
    setActionLoading('');
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6"><CalendarDays className="w-5 h-5 text-slate-300" /><div><div className="h-6 w-44 bg-slate-200 dark:bg-dark-border rounded animate-pulse" /><div className="h-4 w-20 bg-slate-100 dark:bg-dark-border rounded animate-pulse mt-1" /></div></div>
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl mb-6 p-5">
          <Skeleton className="h-4 w-24 mb-3" />
          <SkeletonTable rows={3} cols={2} />
        </div>
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5">
          <Skeleton className="h-4 w-32 mb-3" />
          <SkeletonTable rows={3} cols={2} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <CalendarDays className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Schedule Manager</h1>
          <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">{data?.total || 0} posts · {data?.scheduled || 0} scheduled</p>
        </div>
      </div>

      {message && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-400">{message}</div>
      )}

      {/* Scheduled Posts */}
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl mb-6">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-dark-border flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text">Scheduled ({data?.scheduled || 0})</h2>
        </div>
        {data?.scheduledPosts?.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No posts scheduled</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-dark-border">
            {data?.scheduledPosts?.map(p => (
              <div key={p.slug} className="px-5 py-3 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <a href={`/posts/${p.slug}`} target="_blank" className="text-sm font-medium text-slate-800 dark:text-dark-text hover:text-brand-600 truncate block">{p.title}</a>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>{p.category}</span>
                      <span>·</span>
                      <span>{p.wordCount.toLocaleString()} words</span>
                      <span>·</span>
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(p.scheduledDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                  <a href={`/posts/${p.slug}`} target="_blank" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-border text-slate-400 hover:text-slate-600"><Eye className="w-3.5 h-3.5" /></a>
                  <button onClick={() => handlePublish(p.slug)} disabled={actionLoading === p.slug} className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 hover:text-green-700 disabled:opacity-50"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleUnschedule(p.slug)} disabled={actionLoading === p.slug} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 disabled:opacity-50"><XCircle className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unscheduled Drafts */}
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-dark-border flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text">Unscheduled Drafts ({data?.draftPosts?.length || 0})</h2>
        </div>
        {data?.draftPosts?.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No drafts</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-dark-border">
            {data?.draftPosts?.map(p => (
              <div key={p.slug} className="px-5 py-3 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-slate-800 dark:text-dark-text truncate block">{p.title}</span>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>{p.category}</span>
                      <span>·</span>
                      <span>{p.wordCount.toLocaleString()} words</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                  <button onClick={() => handleSchedule(p.slug)} disabled={actionLoading === p.slug} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs hover:bg-amber-100 disabled:opacity-50 transition">
                    <Calendar className="w-3 h-3" /> Schedule
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

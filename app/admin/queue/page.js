'use client';

import { useState, useEffect } from 'react';
import { ListTodo, Loader2, Send, CheckCircle2, CalendarDays, FileText, ExternalLink, Clock, Zap, Sliders } from 'lucide-react';
import { Skeleton, SkeletonCard, SkeletonTable } from '@/components/admin/Skeleton';

export default function QueuePage() {
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [interval, setInterval] = useState(2);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  });

  useEffect(() => {
    fetch('/admin/api/schedule')
      .then(r => r.json())
      .then(d => { setScheduleData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleAutoSchedule() {
    if (!scheduleData?.draftPosts?.length) return;
    setSaving(true);
    setMessage('');

    const drafts = scheduleData.draftPosts;
    const entries = [];
    let d = new Date(startDate);

    for (const post of drafts) {
      d.setHours(9, 0, 0, 0);
      entries.push({ slug: post.slug, date: d.toISOString().slice(0, 10) });
      d.setDate(d.getDate() + interval);
    }

    try {
      const res = await fetch('/admin/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'batch-schedule', entries }),
      });
      const r = await res.json();
      if (r.success) {
        setMessage(`✅ Scheduled ${r.count} posts over ${drafts.length * interval} days`);
        const r2 = await fetch('/admin/api/schedule');
        setScheduleData(await r2.json());
      }
    } catch {}
    setSaving(false);
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6"><ListTodo className="w-5 h-5 text-slate-300" /><div><div className="h-6 w-40 bg-slate-200 dark:bg-dark-border rounded animate-pulse" /><div className="h-4 w-24 bg-slate-100 dark:bg-dark-border rounded animate-pulse mt-1" /></div></div>
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5 mb-6">
          <Skeleton className="h-4 w-32 mb-3" />
          <Skeleton className="h-3 w-64 mb-4" />
          <div className="flex gap-4 mb-4">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-20" />
          </div>
          <SkeletonTable rows={4} cols={3} />
        </div>
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5">
          <Skeleton className="h-4 w-36 mb-3" />
          <SkeletonTable rows={3} cols={2} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <ListTodo className="w-5 h-5 text-brand-600" />
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Publishing Queue</h1>
          <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">
            {scheduleData?.total || 0} posts · {scheduleData?.scheduled || 0} scheduled · {scheduleData?.draftPosts?.length || 0} drafts
          </p>
        </div>
      </div>

      {message && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-400">{message}</div>
      )}

      {/* Auto-Scheduler */}
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-brand-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text">Auto-Schedule Drafts</h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-dark-muted mb-4">
          Automatically schedule all {scheduleData?.draftPosts?.length || 0} unscheduled drafts starting from a chosen date, with N-day intervals.
        </p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Interval (days)</label>
            <div className="flex items-center gap-2">
              <Sliders className="w-3 h-3 text-slate-400" />
              <input type="number" min="1" max="30" value={interval} onChange={e => setInterval(parseInt(e.target.value) || 2)}
                className="w-16 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500" />
              <span className="text-xs text-slate-400">days apart</span>
            </div>
          </div>
        </div>

        {scheduleData?.draftPosts?.length > 0 && (
          <div className="mb-4 text-xs text-slate-500 bg-slate-50 dark:bg-dark-border rounded-lg p-3">
            <p className="font-medium text-slate-700 dark:text-dark-text mb-2">Preview schedule:</p>
            {scheduleData.draftPosts.slice(0, 5).map((p, i) => {
              const d = new Date(startDate);
              d.setDate(d.getDate() + i * interval);
              return (
                <div key={p.slug} className="flex items-center gap-2 py-0.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  <span className="text-slate-400">→</span>
                  <span className="truncate">{p.title}</span>
                </div>
              );
            })}
            {scheduleData.draftPosts.length > 5 && (
              <p className="text-slate-400 mt-1">...and {scheduleData.draftPosts.length - 5} more</p>
            )}
          </div>
        )}

        <button
          onClick={handleAutoSchedule}
          disabled={saving || !scheduleData?.draftPosts?.length}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium transition"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {saving ? 'Scheduling...' : `Schedule ${scheduleData?.draftPosts?.length || 0} Drafts`}
        </button>
      </div>

      {/* Scheduled Timeline */}
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-dark-border flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text">Upcoming Schedule ({scheduleData?.scheduled || 0})</h2>
        </div>
        {scheduleData?.scheduledPosts?.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No scheduled posts</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-dark-border">
            {scheduleData?.scheduledPosts?.map(p => (
              <div key={p.slug} className="px-5 py-2.5 flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-800 dark:text-dark-text">{p.title}</span>
                    <a href={`/posts/${p.slug}`} target="_blank"><ExternalLink className="w-2.5 h-2.5 text-slate-400" /></a>
                  </div>
                  <div className="text-xs text-slate-400">{new Date(p.scheduledDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · {p.wordCount?.toLocaleString()}w</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

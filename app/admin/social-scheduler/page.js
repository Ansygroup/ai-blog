'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Trash2, Plus, Globe, Loader2, CheckCircle2, XCircle, Timer } from 'lucide-react';
import { Skeleton } from '@/components/admin/Skeleton';
import Link from 'next/link';

const platformMeta = {
  twitter: { label: 'Twitter', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400' },
  linkedin: { label: 'LinkedIn', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  facebook: { label: 'Facebook', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' },
  pinterest: { label: 'Pinterest', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SocialSchedulerPage() {
  const [schedule, setSchedule] = useState([]);
  const [postMap, setPostMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  // Form state
  const [formSlug, setFormSlug] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formPlatforms, setFormPlatforms] = useState(['twitter', 'linkedin', 'facebook']);
  const [formMessage, setFormMessage] = useState('');

  useEffect(() => {
    fetch('/admin/api/social-scheduler')
      .then(r => r.json())
      .then(d => {
        setSchedule(d.schedule || []);
        setPostMap(d.posts || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function togglePlatform(p) {
    setFormPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!formSlug || !formDate || !formTime || formPlatforms.length === 0) return;
    setSubmitting(true);
    const scheduledDate = new Date(`${formDate}T${formTime}:00`).toISOString();
    try {
      const res = await fetch('/admin/api/social-scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postSlug: formSlug, scheduledDate, platforms: formPlatforms, customMessage: formMessage }),
      });
      const d = await res.json();
      if (d.success) {
        setSchedule(prev => [...prev, d.item]);
        setShowForm(false);
        setFormSlug('');
        setFormDate('');
        setFormTime('');
        setFormPlatforms(['twitter', 'linkedin', 'facebook']);
        setFormMessage('');
      }
    } catch {}
    setSubmitting(false);
  }

  async function handleBulkGenerate() {
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const res = await fetch('/admin/api/social-scheduler', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'bulk-generate' }),
      });
      const d = await res.json();
      setBulkResult(d);
      if (d.success) {
        const res2 = await fetch('/admin/api/social-scheduler');
        const d2 = await res2.json();
        setSchedule(d2.schedule || []);
      }
    } catch {}
    setBulkLoading(false);
  }

  async function handleDelete(id) {
    const res = await fetch('/admin/api/social-scheduler', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const d = await res.json();
    if (d.success) setSchedule(prev => prev.filter(s => s.id !== id));
  }

  const statusIcon = (status) => {
    switch (status) {
      case 'published': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Timer className="w-4 h-4 text-amber-500" />;
    }
  };

  const stats = {
    total: schedule.length,
    pending: schedule.filter(s => s.status === 'pending').length,
    published: schedule.filter(s => s.status === 'published').length,
    failed: schedule.filter(s => s.status === 'failed').length,
  };

  const slugs = Object.keys(postMap).sort();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <div>
            <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">
              Social Scheduler
            </h1>
            <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">
              Schedule social media posts in advance
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" />
          {showForm ? 'Cancel' : 'New Schedule'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4">
          <div className="text-2xl font-bold text-slate-900 dark:text-dark-text">{stats.total}</div>
          <div className="text-xs text-slate-500 dark:text-dark-muted">Total Scheduled</div>
        </div>
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4">
          <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          <div className="text-xs text-slate-500 dark:text-dark-muted">Pending</div>
        </div>
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4">
          <div className="text-2xl font-bold text-green-600">{stats.published}</div>
          <div className="text-xs text-slate-500 dark:text-dark-muted">Published</div>
        </div>
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4">
          <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          <div className="text-xs text-slate-500 dark:text-dark-muted">Failed</div>
        </div>
      </div>

      {/* Bulk Generate */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={handleBulkGenerate}
          disabled={bulkLoading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-brand-200 dark:border-brand-800 text-sm font-medium text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/20 disabled:opacity-50 transition"
        >
          {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
          {bulkLoading ? 'Generating...' : 'Auto-Generate for All Uncovered Posts'}
        </button>
        {bulkResult && (
          <span className="text-sm text-green-600">
            ✅ Created {bulkResult.created} new social schedules
          </span>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5 mb-8 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-dark-text mb-1">Post</label>
              <select
                value={formSlug}
                onChange={e => setFormSlug(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-dark-text px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                required
              >
                <option value="">Select a post...</option>
                {slugs.map(slug => (
                  <option key={slug} value={slug}>{postMap[slug]?.title || slug}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-dark-text mb-1">Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-dark-text px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-dark-text mb-1">Time</label>
                <input
                  type="time"
                  value={formTime}
                  onChange={e => setFormTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-dark-text px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-dark-text mb-2">Platforms</label>
            <div className="flex gap-3">
              {Object.entries(platformMeta).map(([key, meta]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formPlatforms.includes(key)}
                    onChange={() => togglePlatform(key)}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${meta.color}`}>{meta.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-dark-text mb-1">Custom Message (optional)</label>
            <textarea
              value={formMessage}
              onChange={e => setFormMessage(e.target.value)}
              rows={2}
              placeholder="Leave empty to use post title"
              className="w-full rounded-lg border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-dark-text px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50 transition"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {submitting ? 'Scheduling...' : 'Schedule Post'}
            </button>
          </div>
        </form>
      )}

      {/* Schedule list */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4"><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><div className="flex-1"><Skeleton className="h-4 w-48 mb-1" /><Skeleton className="h-3 w-32" /></div></div></div>)}
        </div>
      ) : schedule.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-dark-muted">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No scheduled posts yet.</p>
          <button onClick={() => setShowForm(true)} className="text-brand-600 hover:underline text-sm mt-2">Schedule your first post</button>
        </div>
      ) : (
        <div className="space-y-3">
          {schedule.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate)).map(item => {
            const post = postMap[item.postSlug];
            const isPast = new Date(item.scheduledDate) <= new Date() && item.status === 'pending';
            return (
              <div key={item.id} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link href={`/posts/${item.postSlug}`} target="_blank" className="font-semibold text-slate-900 dark:text-dark-text hover:text-brand-600 truncate">
                      {post?.title || item.postSlug}
                    </Link>
                    {statusIcon(item.status)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-dark-muted">
                    <span className={`inline-flex items-center gap-1 ${isPast ? 'text-red-500 font-medium' : ''}`}>
                      <Clock className="w-3 h-3" />
                      {formatDate(item.scheduledDate)}
                    </span>
                    <div className="flex gap-1">
                      {item.platforms.map(p => (
                        <span key={p} className={`px-1.5 py-0.5 rounded text-xs font-medium ${platformMeta[p]?.color || ''}`}>
                          {platformMeta[p]?.label || p}
                        </span>
                      ))}
                    </div>
                    {item.customMessage && (
                      <span className="italic truncate max-w-[200px]">"{item.customMessage}"</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="ml-3 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

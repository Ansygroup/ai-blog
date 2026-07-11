'use client';

import { useState, useEffect } from 'react';
import { Download, Save, Loader2, FileText, Clock, Database, CheckCircle2, ExternalLink, Archive, Trash2 } from 'lucide-react';

export default function BackupPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [backups, setBackups] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/admin/api/backup?action=list')
      .then(r => r.json())
      .then(d => setBackups(d.backups || []))
      .catch(() => {});
  }, []);

  async function handleExport() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/admin/api/backup');
      const d = await res.json();
      setResult(d);
    } catch {}
    setLoading(false);
  }

  async function handleSaveBackup() {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/admin/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save-backup' }),
      });
      const d = await res.json();
      if (d.success) {
        setMessage(`✅ Backup saved: ${d.fileName}`);
        const r2 = await fetch('/admin/api/backup?action=list');
        setBackups((await r2.json()).backups || []);
      }
    } catch {}
    setSaving(false);
  }

  function downloadJson(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Database className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Backup & Export</h1>
          <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">Export all posts as JSON or save server-side backups</p>
        </div>
      </div>

      {message && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-400">{message}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Export */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Download className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text">Export All Posts</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-dark-muted mb-4">Download a complete JSON export of all posts including frontmatter and body content.</p>
          <button
            onClick={handleExport}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {loading ? 'Loading...' : 'Load Export Data'}
          </button>
          {result && (
            <div className="mt-3 text-xs text-slate-500">
              <p>{result.totalPosts} posts · {result.totalWords.toLocaleString()} total words</p>
              <button
                onClick={() => downloadJson(result, `blog-backup-${Date.now()}.json`)}
                className="mt-2 text-brand-600 hover:underline inline-flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> Download JSON
              </button>
            </div>
          )}
        </div>

        {/* Save Backup */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Save className="w-4 h-4 text-green-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text">Save Server Backup</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-dark-muted mb-4">Save a lightweight backup (titles + slugs only) to the server at <code className="text-brand-600">/public/backups/</code>.</p>
          <button
            onClick={handleSaveBackup}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium transition"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Backup'}
          </button>
        </div>
      </div>

      {/* Backup History */}
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text">Backup History</h2>
        </div>
        {backups.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No backups saved yet</p>
        ) : (
          <div className="space-y-1">
            {backups.map(b => (
              <div key={b.file} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-dark-border text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  <span className="font-mono text-slate-700 dark:text-dark-text">{b.file}</span>
                  <span className="text-slate-400">({(b.size / 1024).toFixed(1)} KB)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{new Date(b.date).toLocaleDateString()}</span>
                  <a href={b.path} target="_blank" className="p-1 text-slate-400 hover:text-brand-600 rounded">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

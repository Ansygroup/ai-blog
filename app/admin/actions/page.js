'use client';

import ActionCard from '@/components/admin/action-card';
import { FileText, Sparkles, Search, Link, RefreshCw, PenTool, Play } from 'lucide-react';

const actions = [
  { id: 'generate', title: 'Generate Posts', desc: 'Run the AI content engine to generate new posts from the keyword queue.', icon: FileText, hasInput: true, inputLabel: 'Batch count', inputType: 'number', inputDefault: '3' },
  { id: 'polish', title: 'Polish All Posts', desc: 'Run formatting and content polish across all posts.', icon: Sparkles, hasInput: false },
  { id: 'seo', title: 'SEO Optimize', desc: 'Run AI-powered SEO optimization on posts needing improvement.', icon: Search, hasInput: false },
  { id: 'links', title: 'Auto Internal Links', desc: 'Automatically add relevant internal links between posts.', icon: Link, hasInput: false },
  { id: 'refresh', title: 'Refresh Content', desc: 'Update stale posts with fresh dates and improved content.', icon: RefreshCw, hasInput: false },
  { id: 'humanize', title: 'Humanize Posts', desc: 'Rewrite posts to remove AI writing patterns using Groq + humanizer skill.', icon: PenTool, hasInput: false },
];

export default function AdminActionsPage() {
  async function handleRun(actionId, inputs) {
    const res = await fetch('/admin/api/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: actionId, inputs }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    return data;
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Play className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">
            Actions
          </h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">
          Run blog automation scripts via GitHub Actions
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actions.map((action) => (
          <ActionCard key={action.id} action={action} onRun={handleRun} />
        ))}
      </div>

      <div className="mt-8 rounded-xl border-2 border-dashed border-slate-300 dark:border-dark-border p-6 text-center">
        <p className="text-sm text-slate-500 dark:text-dark-muted">
          Make sure the following env vars are set:
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {['GITHUB_API_TOKEN', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'NEXTAUTH_SECRET', 'VERCEL_API_TOKEN'].map((v) => (
            <code key={v} className="px-2 py-1 rounded bg-slate-100 dark:bg-dark-border text-xs text-slate-600 dark:text-dark-muted font-mono">{v}</code>
          ))}
        </div>
      </div>
    </div>
  );
}

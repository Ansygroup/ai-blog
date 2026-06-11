'use client';

import { useState } from 'react';
import { Play, Loader2 } from 'lucide-react';

export default function ActionCard({ action, onRun }) {
  const [input, setInput] = useState(action.inputDefault || '');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const Icon = action.icon;

  async function handleRun() {
    setRunning(true);
    setResult(null);
    try {
      const inputs = action.hasInput ? { batch: parseInt(input) || 3 } : {};
      await onRun(action.id, inputs);
      setResult('success');
    } catch (err) {
      setResult(err.message || 'error');
    }
    setRunning(false);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:bg-dark-card dark:border-dark-border p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-4">
        <div className="shrink-0"><Icon className="w-5 h-5 text-brand-600 dark:text-brand-400" /></div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-dark-text">{action.title}</h3>
          <p className="text-xs text-slate-500 dark:text-dark-muted mt-1">{action.desc}</p>
          {action.hasInput && (
            <div className="mt-3">
              <label className="block text-xs text-slate-500 dark:text-dark-muted mb-1">{action.inputLabel}</label>
              <input
                type={action.inputType}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-20 px-2 py-1 rounded border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          )}
          <button
            onClick={handleRun}
            disabled={running}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-dark-border text-sm font-medium text-slate-700 dark:text-dark-text hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {running ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            {running ? 'Running...' : 'Run'}
          </button>
          {result === 'success' && (
            <span className="ml-2 text-xs text-green-600 dark:text-green-400">✓ Dispatched</span>
          )}
          {result && result !== 'success' && (
            <span className="ml-2 text-xs text-red-600 dark:text-red-400">✗ {result}</span>
          )}
        </div>
      </div>
    </div>
  );
}

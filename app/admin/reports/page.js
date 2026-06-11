'use client';

import { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';

function parseScore(content) {
  const m = content.match(/\*\*Overall Score: (\d+)\/100\*\*/);
  return m ? parseInt(m[1]) : null;
}

function parseSection(content, heading) {
  const parts = content.split('## ');
  for (const p of parts) {
    if (p.startsWith(heading)) {
      return '## ' + p;
    }
  }
  return '';
}

export default function AdminReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/admin/api/reports')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white dark:bg-dark-card dark:border-dark-border p-8 text-center text-slate-500 dark:text-dark-muted">
        Loading performance reports...
      </div>
    );
  }

  if (!data?.latest) {
    return (
      <div>
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">
              Performance Reports
            </h1>
          </div>
        </div>
        <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-dark-border p-8 text-center">
          <p className="text-sm text-slate-500 dark:text-dark-muted mb-3">No reports yet</p>
          <p className="text-xs text-slate-400">Run the Content Performance Agent from Mission Control to generate your first report.</p>
        </div>
      </div>
    );
  }

  const score = parseScore(data.latest.content);
  const overview = parseSection(data.latest.content, 'Overview');
  const quickWins = parseSection(data.latest.content, 'Quick Wins');
  const weakest = parseSection(data.latest.content, 'Weakest Posts');
  const actions = parseSection(data.latest.content, 'Recommended Actions');

  const scoreColor = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">
            Performance Reports
          </h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">
          {data.latest.file} — {data.reports.length} total reports
        </p>
      </div>

      {score !== null && (
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-dark-card dark:border-dark-border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-slate-700 dark:text-dark-muted">Traffic Opportunity Score</h2>
            <span className={`text-3xl font-bold font-heading ${scoreColor}`}>{score}/100</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-dark-border rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      )}

      {overview && (
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-dark-card dark:border-dark-border p-6 mb-6 overflow-x-auto">
          <h2 className="text-sm font-medium text-slate-700 dark:text-dark-muted mb-4">Overview</h2>
          <table className="w-full text-sm" dangerouslySetInnerHTML={{ __html: parseTable(overview) }} />
        </div>
      )}

      {quickWins && (
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-dark-card dark:border-dark-border p-6 mb-6">
          <h2 className="text-sm font-medium text-slate-700 dark:text-dark-muted mb-4">Quick Wins</h2>
          <pre className="text-xs text-slate-600 dark:text-dark-muted whitespace-pre-wrap font-mono leading-relaxed">
            {quickWins.split('\n').slice(1).join('\n')}
          </pre>
        </div>
      )}

      {weakest && (
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-dark-card dark:border-dark-border p-6 mb-6">
          <h2 className="text-sm font-medium text-slate-700 dark:text-dark-muted mb-4">Weakest Posts (Priority Fixes)</h2>
          <pre className="text-xs text-slate-600 dark:text-dark-muted whitespace-pre-wrap font-mono leading-relaxed">
            {weakest.split('\n').slice(1).join('\n')}
          </pre>
        </div>
      )}

      {actions && (
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-dark-card dark:border-dark-border p-6">
          <h2 className="text-sm font-medium text-slate-700 dark:text-dark-muted mb-4">Recommended Actions</h2>
          <div className="text-sm text-slate-900 dark:text-dark-text space-y-2" dangerouslySetInnerHTML={{
            __html: actions
              .split('\n').slice(1).join('\n')
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/- /g, '• ')
              .replace(/\n/g, '<br/>')
          }} />
        </div>
      )}
    </div>
  );
}

function parseTable(md) {
  const lines = md.split('\n').filter(l => l.startsWith('|'));
  if (lines.length < 2) return '';

  const headers = lines[0].split('|').filter(Boolean).map(h => h.trim());
  let html = '<table class="w-full text-sm">';
  html += '<thead><tr>' + headers.map(h => `<th class="text-left px-3 py-2 text-slate-600 dark:text-dark-muted border-b border-slate-200 dark:border-dark-border">${h}</th>`).join('') + '</tr></thead>';
  html += '<tbody>';

  for (let i = 2; i < lines.length; i++) {
    const cells = lines[i].split('|').filter(Boolean).map(c => c.trim());
    if (cells.length === 0) continue;
    html += '<tr>' + cells.map(c => {
      const clean = c.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return `<td class="px-3 py-2 text-slate-900 dark:text-dark-text border-b border-slate-100 dark:border-dark-border">${clean}</td>`;
    }).join('') + '</tr>';
  }

  html += '</tbody></table>';
  return html;
}

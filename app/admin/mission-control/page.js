'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Cpu, Activity, CheckCircle, XCircle, Clock, Play, Loader2, ExternalLink, RefreshCw, AlertTriangle, Sparkles, Lightbulb, History, Bot, FileText, Hash, ListTodo, Calendar, Search, Globe, Mail, RefreshCw as RefreshIcon, Eye } from 'lucide-react';
import VisitorStatsWidget from '@/components/admin/VisitorStatsWidget';

const CATEGORIES = [
  { id: 'generation', label: 'Content Generation', color: 'blue' },
  { id: 'quality', label: 'Quality & SEO', color: 'green' },
  { id: 'distribution', label: 'Distribution', color: 'purple' },
  { id: 'intelligence', label: 'Intelligence', color: 'orange' },
  { id: 'monetization', label: 'Monetization', color: 'yellow' },
  { id: 'maintenance', label: 'Maintenance', color: 'slate' },
  { id: 'infra', label: 'Infrastructure', color: 'cyan' },
];

const STATUS_COLORS = {
  completed: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
  success: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
  failure: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  in_progress: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500 animate-pulse' },
  queued: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-500' },
  unknown: { bg: 'bg-slate-100 dark:bg-dark-border', text: 'text-slate-500 dark:text-dark-muted', dot: 'bg-slate-400' },
};

function timeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function MissionControlPage() {
  const { data: session } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(null);
  const [aiDecision, setAiDecision] = useState(null);
  const [aiDecisionLoading, setAiDecisionLoading] = useState(true);

  async function fetchStatus() {
    setLoading(true);
    try {
      const [statusRes, aiRes] = await Promise.all([
        fetch('/admin/api/mission-control'),
        fetch('/admin/api/mission-control?ai-decision=true').then(r => r.json()).catch(() => ({ decision: null, generated: false })),
      ]);
      const d = await statusRes.json();
      if (d.error) { setError(d.error); }
      else { setData(d); setError(null); }
      setAiDecision(aiRes.decision);
      setAiDecisionLoading(false);
    } catch (err) { setError(err.message); }
    setLoading(false);
  }

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  async function runAgent(agent) {
    setRunning(agent.id);
    try {
      const res = await fetch('/admin/api/mission-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId: agent.workflow }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setTimeout(fetchStatus, 5000);
    } catch (err) {
      alert(`Failed: ${err.message}`);
    }
    setRunning(null);
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-dark-border p-8 text-center">
        <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-red-500" />
        <p className="text-sm text-slate-500 dark:text-dark-muted mb-2">{error}</p>
        <button onClick={fetchStatus} className="text-sm text-brand-600 hover:underline">Retry</button>
      </div>
    );
  }

  const agents = data?.agents || [];
  const system = data?.system || {};

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cpu className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <div>
              <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">
                Mission Control
              </h1>
              <p className="text-sm text-slate-500 dark:text-dark-muted mt-0.5">
                AI Agent Fleet · {agents.length} agents · {session?.user?.name || 'Commander'}
              </p>
            </div>
          </div>
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-dark-border text-sm font-medium text-slate-600 dark:text-dark-muted hover:bg-slate-50 dark:hover:bg-dark-border disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'System Uptime', value: `${system.uptime || 100}%`, icon: Activity, color: system.uptime >= 80 ? 'text-green-500' : 'text-yellow-500', sub: `Last ${system.totalRuns || 0} runs` },
          { label: 'Successful Runs', value: system.successRuns || 0, icon: CheckCircle, color: 'text-green-500', sub: `${system.totalRuns ? Math.round((system.successRuns / system.totalRuns) * 100) : 0}% success rate` },
          { label: 'Failed Runs', value: system.failRuns || 0, icon: XCircle, color: system.failRuns > 0 ? 'text-red-500' : 'text-slate-400', sub: 'Requires attention' },
          { label: 'In Progress', value: system.inProgress || 0, icon: Loader2, color: 'text-blue-500', sub: system.inProgress > 0 ? 'Running now' : 'All idle' },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white dark:bg-dark-card dark:border-dark-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-xs font-medium text-slate-500 dark:text-dark-muted uppercase tracking-wider">{label}</span>
            </div>
            <div className={`text-2xl font-bold font-heading ${color}`}>{value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Site Summary Widgets */}
      <div className="grid grid-cols-3 lg:grid-cols-9 gap-3 mb-8">
        {[
          { label: 'Total Posts', value: data?.widgets?.totalPosts ?? '-', icon: FileText, color: 'text-slate-500', href: '/admin/posts' },
          { label: 'Queue', value: data?.widgets?.queueSize ?? '-', icon: ListTodo, color: 'text-amber-500', href: '/admin/queue' },
          { label: 'Weak SEO', value: data?.widgets?.weakSeo ?? '-', icon: Search, color: data?.widgets?.weakSeo > 0 ? 'text-red-500' : 'text-green-500', href: '/admin/seo' },
          { label: 'Excerpt Issues', value: data?.widgets?.excerptIssues ?? '-', icon: Hash, color: data?.widgets?.excerptIssues > 0 ? 'text-amber-500' : 'text-green-500', href: '/admin/seo-meta' },
          { label: 'Stale Posts', value: data?.widgets?.stalePosts ?? '-', icon: RefreshIcon, color: data?.widgets?.stalePosts > 10 ? 'text-red-500' : 'text-amber-500', href: '/admin/content-refresh' },
          { label: 'No Int. Links', value: data?.widgets?.missingInternalLinks ?? '-', icon: Globe, color: data?.widgets?.missingInternalLinks > 0 ? 'text-amber-500' : 'text-green-500', href: '/admin/links' },
          { label: 'Pending Social', value: data?.widgets?.pendingSocial ?? '-', icon: Calendar, color: 'text-purple-500', href: '/admin/social-scheduler' },
          { label: 'Newsletter', value: '-', icon: Mail, color: 'text-blue-500', href: '/admin/newsletter' },
        ].map(({ label, value, icon: Icon, color, href }) => (
          <a
            key={label}
            href={href}
            className="rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-3 hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition text-center"
          >
            <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
            <div className="text-lg font-bold text-slate-900 dark:text-dark-text leading-tight">{value}</div>
            <div className="text-[10px] text-slate-400 dark:text-dark-muted leading-tight mt-0.5">{label}</div>
          </a>
        ))}
        <VisitorStatsWidget />
      </div>

      {/* AI Auto-Pilot Recommendation */}
      {aiDecisionLoading && (
        <div className="rounded-xl border border-brand-200 dark:border-brand-800 bg-gradient-to-r from-brand-50 to-indigo-50 dark:from-dark-card dark:to-dark-border p-5 mb-6 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
          <p className="text-sm text-brand-700 dark:text-brand-300">AI is analyzing site status...</p>
        </div>
      )}
      {aiDecision && !aiDecisionLoading && (
        <div className="rounded-xl border border-brand-200 dark:border-brand-800 bg-gradient-to-r from-brand-50 to-indigo-50 dark:from-dark-card dark:to-dark-border p-5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text uppercase tracking-wider">AI Auto-Pilot Recommendation</h2>
            <span className="text-[10px] bg-brand-600 text-white px-1.5 py-0.5 rounded font-medium">LIVE</span>
          </div>
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-brand-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700 dark:text-dark-muted">{aiDecision.reason}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  aiDecision.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  aiDecision.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                  'bg-slate-100 text-slate-500 dark:bg-dark-border dark:text-dark-muted'
                }`}>
                  {aiDecision.priority?.toUpperCase()} PRIORITY
                </span>
                <button
                  onClick={() => {
                    const target = agents.find(a => a.workflow === aiDecision.nextAction);
                    if (target) runAgent(target);
                  }}
                  disabled={running === aiDecision.nextAction}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-medium transition"
                >
                  {running === aiDecision.nextAction ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                  Run {aiDecision.nextAction?.replace('.yml', '')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Pilot Execution History */}
      {data?.autoPilotHistory?.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-slate-500 dark:text-dark-muted" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text uppercase tracking-wider">Auto-Pilot History</h2>
            <span className="text-[10px] text-slate-400">Last {data.autoPilotHistory.length} runs</span>
          </div>
          <div className="space-y-2">
            {data.autoPilotHistory.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 text-xs p-2 rounded-lg bg-slate-50 dark:bg-dark-border">
                <Bot className={`w-3.5 h-3.5 shrink-0 ${entry.allSuccess ? 'text-green-500' : 'text-red-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${entry.allSuccess ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                      {entry.mode === 'full' ? 'Full Cycle' : 'Smart Run'}
                    </span>
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-500 dark:text-dark-muted">{entry.successCount}/{entry.failCount + entry.successCount} steps</span>
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-500 dark:text-dark-muted">{(entry.duration / 1000).toFixed(0)}s</span>
                  </div>
                  <div className="text-slate-400 mt-0.5">
                    {entry.results?.map(r => r.action).join(', ') || 'No steps recorded'}
                  </div>
                </div>
                <span className="text-slate-400 shrink-0">{new Date(entry.timestamp).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent Cards by Category */}
      <div className="space-y-8">
        {CATEGORIES.map((cat) => {
          const catAgents = agents.filter((a) => a.category === cat.id);
          if (catAgents.length === 0) return null;
          const runningCount = catAgents.filter((a) => a.status === 'in_progress').length;

          return (
            <div key={cat.id}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-lg font-heading font-bold text-slate-900 dark:text-dark-text">{cat.label}</h2>
                {runningCount > 0 && (
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                    {runningCount} running
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {catAgents.map((agent) => {
                  const sc = STATUS_COLORS[agent.conclusion] || STATUS_COLORS[agent.status] || STATUS_COLORS.unknown;
                  const isRunning = agent.status === 'in_progress';
                  const isFailed = agent.conclusion === 'failure';

                  return (
                    <div
                      key={agent.id}
                      className={`rounded-xl border bg-white dark:bg-dark-card p-4 transition-all hover:shadow-sm ${
                        isFailed ? 'border-red-300 dark:border-red-800' : isRunning ? 'border-blue-300 dark:border-blue-800' : 'border-slate-200 dark:border-dark-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="text-xl shrink-0 mt-0.5">{agent.emoji}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold text-slate-900 dark:text-dark-text truncate">
                                {agent.name}
                              </h3>
                              {agent.tier === 'core' && (
                                <span className="text-[10px] font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                                  Core
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-dark-muted mt-0.5 line-clamp-1">{agent.desc}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {agent.schedule}
                              </span>
                              <span className={`inline-flex items-center gap-1`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                {agent.conclusion || agent.status}
                              </span>
                              {agent.lastRun && (
                                <span>{timeAgo(agent.lastRun)}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {agent.runUrl && (
                            <a
                              href={agent.runUrl}
                              target="_blank"
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-border text-slate-400 hover:text-slate-600 dark:hover:text-dark-text transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => runAgent(agent)}
                            disabled={running === agent.id || isRunning}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-border text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 disabled:opacity-30 transition-colors"
                            title={`Run ${agent.name}`}
                          >
                            {running === agent.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Play className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

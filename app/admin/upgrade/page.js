'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUp, Search, Sparkles, AlertTriangle, Info, ChevronRight, FileText, RefreshCw, Expand, Loader2, CheckCircle, XCircle, BarChart3, Clock, BookOpen, Tag } from 'lucide-react';

export default function UpgradePage() {
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/admin/api/upgrade').then(r => r.json()).then(d => setPosts(d.posts || [])).catch(() => {});
  }, []);

  const filtered = posts.filter(p =>
    !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.slug?.includes(search.toLowerCase())
  );

  async function analyze() {
    if (!selectedSlug) return;
    setLoading(true);
    setError('');
    setAnalysis(null);
    try {
      const res = await fetch('/admin/api/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: selectedSlug }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Analysis failed'); return; }
      setAnalysis(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function SeverityBadge({ severity }) {
    const map = {
      critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    };
    return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[severity] || map.info}`}>{severity}</span>;
  }

  function ScoreBar({ score }) {
    const color = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500';
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-slate-200 dark:bg-dark-border rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${score}%` }} />
        </div>
        <span className="text-sm font-bold w-8 text-right">{score}</span>
      </div>
    );
  }

  const selectedPost = posts.find(p => p.slug === selectedSlug);

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <ArrowUp className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Content Upgrader</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">Deep-analyze any post and get AI-powered upgrade recommendations</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-400 mb-6 flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Post selector */}
      <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-4 h-4 text-slate-500" />
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Select a Post</h2>
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search posts..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none" />
            {search && filtered.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto">
                {filtered.slice(0, 20).map(p => (
                  <button key={p.slug} onClick={() => { setSelectedSlug(p.slug); setSearch(''); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-dark-border transition flex items-center justify-between ${selectedSlug === p.slug ? 'bg-brand-50 dark:bg-brand-900/20' : ''}`}>
                    <span className="truncate">{p.title}</span>
                    <span className="text-xs text-slate-400 shrink-0 ml-2">{p.wordCount || p.readingTime * 220} words</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={analyze} disabled={loading || !selectedSlug}
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-semibold rounded-xl transition flex items-center gap-2 text-sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
        {selectedPost && !analysis && (
          <p className="text-xs text-slate-400 mt-2">Selected: <strong>{selectedPost.title}</strong></p>
        )}
      </div>

      {/* Analysis results */}
      {analysis && (
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-dark-text">{analysis.title}</h2>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{analysis.category}</span>
                  <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{analysis.wordCount} words</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{analysis.readingTime} min read</span>
                  <span className={`flex items-center gap-1 ${analysis.ageDays > 180 ? 'text-amber-600' : ''}`}>
                    <RefreshCw className="w-3 h-3" />{analysis.ageDays} days old
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{analysis.overallScore}</div>
                <div className="text-xs text-slate-400">Overall Score</div>
              </div>
            </div>
            <ScoreBar score={analysis.overallScore} />
          </div>

          {/* Two columns: Issues + Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Issues */}
            <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Issues Found ({analysis.issues.length})</h3>
              </div>
              {analysis.issues.length === 0 ? (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  No issues detected
                </div>
              ) : (
                <div className="space-y-2">
                  {analysis.issues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-dark-border">
                      <div className="mt-0.5 shrink-0">
                        {issue.severity === 'critical' ? <XCircle className="w-4 h-4 text-red-500" /> :
                         issue.severity === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-500" /> :
                         <Info className="w-4 h-4 text-blue-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900 dark:text-dark-text">{issue.label}</span>
                          <SeverityBadge severity={issue.severity} />
                        </div>
                        {issue.detail && <p className="text-xs text-slate-500 mt-0.5">{issue.detail}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recommendations */}
            <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Recommendations</h3>
              </div>
              {analysis.recommendations.length === 0 ? (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Post looks great!
                </div>
              ) : (
                <div className="space-y-2">
                  {analysis.recommendations.map((rec, i) => (
                    <div key={i}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-dark-border hover:bg-brand-50 dark:hover:bg-brand-900/10 transition cursor-pointer"
                      onClick={() => router.push(`/admin/posts`)}>
                      <div className="flex items-center gap-3">
                        {rec.type === 'expand' ? <Expand className="w-4 h-4 text-brand-600" /> :
                         rec.type === 'excerpt' ? <FileText className="w-4 h-4 text-brand-600" /> :
                         rec.type === 'refresh' ? <RefreshCw className="w-4 h-4 text-brand-600" /> :
                         <Sparkles className="w-4 h-4 text-brand-600" />}
                        <div>
                          <span className="text-sm font-medium text-slate-900 dark:text-dark-text">{rec.label}</span>
                          <p className="text-xs text-slate-400">Go to Posts → select "{analysis.title}" → run "{rec.action}"</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* AI Suggestions */}
          {(analysis.aiTitleSuggestion || analysis.aiSuggestedTags) && (
            <div className="rounded-xl border border-purple-200 dark:border-purple-900/30 bg-purple-50 dark:bg-purple-900/10 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-purple-800 dark:text-purple-400">AI Suggestions</h3>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {analysis.aiTitleSuggestion && (
                  <div>
                    <span className="text-xs font-medium text-purple-700 uppercase tracking-wider">Suggested Title</span>
                    <p className="text-sm text-purple-800 mt-1">{analysis.aiTitleSuggestion}</p>
                  </div>
                )}
                {analysis.aiSuggestedTags?.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-purple-700 uppercase tracking-wider">Suggested Tags</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {analysis.aiSuggestedTags.map(t => (
                        <span key={t} className="px-2 py-0.5 bg-white dark:bg-dark-card border border-purple-200 dark:border-purple-900/30 rounded-full text-xs text-purple-800 dark:text-purple-400">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags and excerpt display */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-5">
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Current Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {analysis.tags.length > 0 ? analysis.tags.map(t => (
                  <span key={t} className="px-2 py-0.5 bg-slate-100 dark:bg-dark-border rounded-full text-xs text-slate-700 dark:text-dark-text">{t}</span>
                )) : <span className="text-xs text-slate-400">No tags</span>}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-5">
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Current Excerpt</h3>
              <p className="text-sm text-slate-700 dark:text-dark-text">{analysis.excerpt || <span className="text-slate-400 italic">No excerpt</span>}</p>
              <p className="text-xs text-slate-400 mt-1">{analysis.excerpt.length} characters</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

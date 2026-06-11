'use client';

import { useState } from 'react';
import { FileText, Search, Tag, BookOpen, HelpCircle, ListChecks, ArrowRight, Lightbulb } from 'lucide-react';

export default function ContentBriefPage() {
  const [topic, setTopic] = useState('');
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function generate(e) {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    setBrief(null);
    try {
      const res = await fetch('/admin/api/content-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); return; }
      setBrief(await res.json());
    } catch { setError('Failed to generate brief'); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Lightbulb className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Content Brief Generator</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">Enter a topic and get a structured content brief based on existing site content</p>
      </div>

      <form onSubmit={generate} className="flex gap-3 mb-6">
        <input
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="e.g., AI video editing, ChatGPT vs Claude, best laptops for AI"
          className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-dark-text focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
        />
        <button
          type="submit"
          disabled={loading || !topic.trim()}
          className="px-6 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-semibold rounded-xl transition flex items-center gap-2 text-sm"
        >
          {loading ? 'Analyzing...' : 'Generate Brief'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 mb-6">{error}</div>}

      {brief && (
        <div className="space-y-4">
          {/* Coverage status */}
          <div className={`rounded-xl border p-4 flex items-center gap-3 ${brief.existingCoverage === 'gap' ? 'border-green-200 bg-green-50 dark:bg-green-900/20' : 'border-amber-200 bg-amber-50 dark:bg-amber-900/20'}`}>
            <span className="text-lg">{brief.existingCoverage === 'gap' ? '🟢' : '🟡'}</span>
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-dark-text">
                {brief.existingCoverage === 'gap' ? 'Content Gap — No existing posts cover this topic' : `${brief.existingPosts} existing post${brief.existingPosts > 1 ? 's' : ''} cover this topic`}
              </div>
              <div className="text-xs text-slate-500">Suggested title: <span className="font-mono">{brief.suggestedTitle}</span></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Suggested tags */}
            <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-slate-500" />
                <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Suggested Tags</h2>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {brief.suggestedTags.map(t => (
                  <span key={t} className="text-xs bg-slate-100 dark:bg-dark-border text-slate-700 dark:text-dark-text px-2.5 py-1 rounded-full">{t}</span>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-slate-500" />
                <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Target Category</h2>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {brief.categories.length > 0 ? brief.categories.map(c => (
                  <span key={c} className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full">{c}</span>
                )) : <span className="text-xs text-slate-400">No existing category — consider creating a new one</span>}
              </div>
            </div>
          </div>

          {/* Suggested questions */}
          {brief.suggestedQuestions.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <HelpCircle className="w-4 h-4 text-slate-500" />
                <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Questions to Answer in FAQ</h2>
              </div>
              <div className="space-y-2">
                {brief.suggestedQuestions.map((q, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-brand-600 dark:text-brand-400 mt-0.5 shrink-0">Q{i + 1}.</span>
                    <span className="text-slate-700 dark:text-dark-text">{q}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested structure */}
          <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <ListChecks className="w-4 h-4 text-slate-500" />
              <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Suggested Structure ({brief.suggestedWordCount.toLocaleString()} words target)</h2>
            </div>
            <div className="space-y-1.5">
              {brief.suggestedStructure.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-dark-border">
                  <span className="text-slate-400 text-xs mt-0.5 w-5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-slate-900 dark:text-dark-text">{s.heading}</span>
                    <p className="text-xs text-slate-500">{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Related posts */}
          {brief.relatedPosts.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-slate-500" />
                <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Related Existing Content</h2>
              </div>
              <div className="space-y-2">
                {brief.relatedPosts.map(p => (
                  <div key={p.slug} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-dark-border">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-slate-700 dark:text-dark-text truncate block">{p.title}</span>
                      <span className="text-xs text-slate-400">{p.category} · {p.wordCount.toLocaleString()} words</span>
                    </div>
                    <a href={`/posts/${p.slug}`} target="_blank" rel="noopener" className="text-xs text-brand-600 hover:underline shrink-0 ml-3">View →</a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!brief && !loading && (
        <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-dark-border p-12 text-center">
          <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Enter a topic above to generate a content brief</p>
          <p className="text-xs text-slate-400 mt-1">The tool analyzes existing content and suggests tags, structure, questions, and more</p>
        </div>
      )}
    </div>
  );
}

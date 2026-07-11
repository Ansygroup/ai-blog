'use client';

import { useState, useRef, useEffect } from 'react';
import { FileText, Send, Sparkles, Wand2, Expand, Search, RotateCcw, Save, Eye, Edit3, X, Check, AlertCircle, Loader2 } from 'lucide-react';

function mdToHtml(md) {
  if (!md) return '';
  let html = md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded-lg my-4" />')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-blue-600 underline">$1</a>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hul])/gm, '<p>')
    .replace(/(\S)\n(\S)/g, '$1 $2');
  return `<p>${html}</p>`;
}

export default function WriterPage() {
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [instruction, setInstruction] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [seoResult, setSeoResult] = useState(null);
  const textareaRef = useRef(null);

  async function callAI(action, extra = {}) {
    setLoading(action);
    setError('');
    setResult(null);
    setSeoResult(null);
    try {
      const res = await fetch('/admin/api/writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, content, title, category, tags: tags.split(',').map(t => t.trim()).filter(Boolean), instruction, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Request failed'); return; }

      if (action === 'suggest-seo') {
        setSeoResult(data);
        if (data.title && !title) setTitle(data.title);
        if (data.excerpt && !excerpt) setExcerpt(data.excerpt);
        if (data.tags && !tags) setTags(data.tags.join(', '));
        return;
      }

      if (data.content) {
        if (action === 'generate') {
          setContent(prev => prev + '\n\n' + data.content);
        } else {
          setContent(data.content);
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  function insertAtCursor(text) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    setContent(prev => prev.slice(0, start) + text + prev.slice(end));
    setTimeout(() => ta.selectionStart = ta.selectionEnd = start + text.length, 0);
  }

  function saveToFile() {
    if (!title) { setError('Title is required to save'); return; }
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const frontmatter = [
      '---',
      `title: "${title.replace(/"/g, '\\"')}"`,
      `date: ${new Date().toISOString().split('T')[0]}`,
      `category: ${category || 'Uncategorized'}`,
      excerpt ? `excerpt: "${excerpt.replace(/"/g, '\\"')}"` : '',
      tags ? `tags: [${tags.split(',').map(t => `"${t.trim()}"`).join(', ')}]` : '',
      '---',
      '',
    ].filter(Boolean).join('\n');
    const blob = new Blob([frontmatter + content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setResult('File saved! Check your downloads.');
  }

  function wordCount(text) {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">AI Writing Assistant</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">Write, edit, and optimize posts with AI assistance</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-400 mb-6 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 p-4 text-sm text-green-700 dark:text-green-400 mb-6 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          {result}
        </div>
      )}

      {/* Meta fields */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Post title..."
            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-dark-text focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-lg font-bold" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Category</label>
          <input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. AI Tools"
            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-dark-text focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Excerpt</label>
          <input value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="Brief description for search results..."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-dark-text focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Tags (comma-separated)</label>
          <input value={tags} onChange={e => setTags(e.target.value)} placeholder="ai, tools, review"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-dark-text focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm" />
        </div>
      </div>

      {/* AI Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider mr-2">AI Tools:</span>
        <button onClick={() => callAI('generate')} disabled={loading || !title}
          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition flex items-center gap-1.5">
          {loading === 'generate' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Generate
        </button>
        <button onClick={() => callAI('rewrite')} disabled={loading || !content}
          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-dark-border text-xs font-medium hover:bg-slate-50 dark:hover:bg-dark-border disabled:opacity-50 transition flex items-center gap-1.5">
          {loading === 'rewrite' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          Rewrite
        </button>
        <button onClick={() => callAI('expand')} disabled={loading || !content}
          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-dark-border text-xs font-medium hover:bg-slate-50 dark:hover:bg-dark-border disabled:opacity-50 transition flex items-center gap-1.5">
          {loading === 'expand' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Expand className="w-3.5 h-3.5" />}
          Expand
        </button>
        <button onClick={() => callAI('suggest-seo')} disabled={loading || !content}
          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-dark-border text-xs font-medium hover:bg-slate-50 dark:hover:bg-dark-border disabled:opacity-50 transition flex items-center gap-1.5">
          {loading === 'suggest-seo' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          Suggest SEO
        </button>
        <button onClick={() => setShowCustom(!showCustom)}
          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-dark-border text-xs font-medium hover:bg-slate-50 dark:hover:bg-dark-border transition flex items-center gap-1.5">
          <Send className="w-3.5 h-3.5" />
          Custom
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-400">{wordCount(content)} words</span>
          <button onClick={() => setPreview(!preview)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-dark-border text-xs font-medium hover:bg-slate-50 dark:hover:bg-dark-border transition flex items-center gap-1.5">
            {preview ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {preview ? 'Edit' : 'Preview'}
          </button>
          <button onClick={saveToFile} disabled={!title}
            className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white text-xs font-semibold transition flex items-center gap-1.5">
            <Save className="w-3.5 h-3.5" />
            Save
          </button>
        </div>
      </div>

      {showCustom && (
        <div className="flex gap-2 mb-3">
          <input value={instruction} onChange={e => setInstruction(e.target.value)}
            placeholder="e.g. Make this more technical, add a case study, write a conclusion..."
            className="flex-1 px-4 py-2 rounded-xl border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); callAI('custom'); } }} />
          <button onClick={() => callAI('custom')} disabled={loading || !instruction}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white text-sm font-semibold transition flex items-center gap-2">
            {loading === 'custom' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Go
          </button>
          <button onClick={() => { setShowCustom(false); setInstruction(''); }}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-dark-border text-sm hover:bg-slate-50 dark:hover:bg-dark-border transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editor + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`${preview ? 'hidden lg:block' : ''}`}>
          <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card overflow-hidden">
            <div className="px-4 py-2 bg-slate-50 dark:bg-dark-border border-b border-slate-200 dark:border-dark-border flex items-center gap-1">
              {['**Bold**', '*Italic*', '[Link](url)', '## Heading', '- List'].map(snippet => (
                <button key={snippet} onClick={() => insertAtCursor(snippet)}
                  className="px-2 py-0.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-dark-text hover:bg-slate-200 dark:hover:bg-dark-bg rounded transition">
                  {snippet}
                </button>
              ))}
            </div>
            <textarea ref={textareaRef} value={content} onChange={e => setContent(e.target.value)}
              placeholder="Start writing your post here... Use markdown for formatting."
              className="w-full h-[500px] p-4 bg-transparent text-sm text-slate-900 dark:text-dark-text font-mono focus:outline-none resize-y" />
          </div>
        </div>
        <div className={`${!preview ? 'hidden lg:block' : ''}`}>
          <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-4 h-[500px] overflow-y-auto prose prose-sm max-w-none dark:prose-invert">
            {content ? <div dangerouslySetInnerHTML={{ __html: mdToHtml(content) }} /> : (
              <p className="text-slate-400 text-sm">Preview will appear here...</p>
            )}
          </div>
        </div>
      </div>

      {/* SEO Suggestions */}
      {seoResult && (
        <div className="mt-6 rounded-xl border border-green-200 dark:border-green-900/30 bg-green-50 dark:bg-green-900/10 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-4 h-4 text-green-600" />
            <h3 className="text-sm font-bold text-green-800 dark:text-green-400">SEO Suggestions</h3>
          </div>
          {seoResult.title && (
            <div className="mb-3">
              <span className="text-xs font-medium text-green-700 uppercase tracking-wider">Suggested Title</span>
              <p className="text-sm text-green-800 mt-0.5">{seoResult.title} <span className="text-green-500 text-xs">({seoResult.title.length}/60 chars)</span></p>
            </div>
          )}
          {seoResult.excerpt && (
            <div className="mb-3">
              <span className="text-xs font-medium text-green-700 uppercase tracking-wider">Suggested Excerpt</span>
              <p className="text-sm text-green-800 mt-0.5">{seoResult.excerpt} <span className="text-green-500 text-xs">({seoResult.excerpt.length} chars)</span></p>
            </div>
          )}
          {seoResult.tags?.length > 0 && (
            <div className="mb-3">
              <span className="text-xs font-medium text-green-700 uppercase tracking-wider">Suggested Tags</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {seoResult.tags.map(t => <span key={t} className="px-2 py-0.5 bg-white dark:bg-dark-card border border-green-200 dark:border-green-900/30 rounded-full text-xs text-green-800 dark:text-green-400">{t}</span>)}
              </div>
            </div>
          )}
          {seoResult.improvements?.length > 0 && (
            <div>
              <span className="text-xs font-medium text-green-700 uppercase tracking-wider">Improvements</span>
              <ul className="mt-1 space-y-1">
                {seoResult.improvements.map((imp, i) => (
                  <li key={i} className="text-sm text-green-800 flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">•</span>
                    {imp}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Quick stats */}
      <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
        <span>Words: {wordCount(content)}</span>
        <span>Chars: {content.length}</span>
        <span>Reading time: ~{Math.max(1, Math.round(wordCount(content) / 220))} min</span>
        {title && <span>Slug: {title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}</span>}
      </div>
    </div>
  );
}

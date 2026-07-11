'use client';

import { useState, useEffect } from 'react';
import { Search, Cpu, TrendingUp, FileText, ClipboardList, GripVertical, ListTodo, BarChart3, Crosshair, Lightbulb, Calendar, CalendarDays, BookOpen, Link2, Rocket, Play, PenSquare, Hash, Tag, Mail, RefreshCw, Activity, Send, Eye, ShoppingCart, Database, ArrowUp, MessageSquare, ExternalLink } from 'lucide-react';

const icons = {
  '/admin': Cpu,
  '/admin/analytics': TrendingUp,
  '/admin/performance': TrendingUp,
  '/admin/posts': FileText,
  '/admin/content-audit': ClipboardList,
  '/admin/content-pipeline': GripVertical,
  '/admin/queue': ListTodo,
  '/admin/seo': Search,
  '/admin/seo-preview': Eye,
  '/admin/reports': BarChart3,
  '/admin/content-gaps': Crosshair,
  '/admin/content-brief': Lightbulb,
  '/admin/calendar': Calendar,
  '/admin/schedule': CalendarDays,
  '/admin/series': BookOpen,
  '/admin/bulk-edit': PenSquare,
  '/admin/links': Link2,
  '/admin/deploy': Rocket,
  '/admin/actions': Play,
  '/admin/backup': Database,
  '/admin/upgrade': ArrowUp,
  '/admin/writer': PenSquare,
  '/admin/ai-chat': MessageSquare,
  '/admin/tags': Hash,
  '/admin/categories': Tag,
  '/admin/newsletter': Mail,
  '/admin/content-refresh': RefreshCw,
  '/admin/workflows': Activity,
  '/admin/activity': Activity,
  '/admin/social-scheduler': Send,
  '/admin/seo-meta': Search,
  '/admin/affiliates': ShoppingCart,
  '/admin/site-health': Activity,
  '/admin/visits': Eye,
};

const pages = Object.keys(icons);

const RECENT_KEY = 'opencode-admin-recent';
const MAX_RECENT = 8;

function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}

function addRecent(query) {
  try {
    const list = getRecent().filter(s => s !== query);
    list.unshift(query);
    if (list.length > MAX_RECENT) list.length = MAX_RECENT;
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    return list;
  } catch { return []; }
}

function clearRecent() {
  try { localStorage.removeItem(RECENT_KEY); } catch {}
}

export default function AdminSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [posts, setPosts] = useState([]);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    fetch('/admin/api/bulk-edit').then(r => r.json()).then(d => setPosts(d.posts || [])).catch(() => {});
    setRecent(getRecent());
  }, []);

  useEffect(() => {
    function handler(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(o => !o); }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!open) { setQuery(''); setRecent(getRecent()); }
  }, [open]);

  const filteredPages = pages.filter(p => {
    const label = p.replace('/admin/', '').replace(/-/g, ' ').trim() || 'mission control';
    return label.includes(query.toLowerCase());
  });
  const filteredPosts = posts.filter(p => p.title?.toLowerCase().includes(query.toLowerCase()) || p.slug.includes(query));

  const hasResults = query.length > 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-black/40" />
      <div className="relative w-full max-w-lg bg-white dark:bg-dark-card rounded-xl shadow-2xl border border-slate-200 dark:border-dark-border overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-dark-border">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && query.trim()) doSearch(query); }}
            placeholder="Search pages & posts..."
            className="flex-1 text-sm bg-transparent text-slate-800 dark:text-dark-text placeholder-slate-400 focus:outline-none"
          />
          <kbd className="text-xs text-slate-400 bg-slate-100 dark:bg-dark-border px-1.5 py-0.5 rounded">ESC</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {!hasResults && recent.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center justify-between px-2 py-1">
                <p className="text-xs text-slate-400 font-medium">Recent</p>
                <button onClick={() => { clearRecent(); setRecent([]); }} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Clear</button>
              </div>
              {recent.map((q) => (
                <button key={q} onClick={() => doSearch(q)} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-dark-border text-sm text-slate-600 dark:text-dark-muted text-left">
                  <Search className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  <span className="truncate">{q}</span>
                </button>
              ))}
            </div>
          )}
          {!hasResults && recent.length === 0 && <p className="text-xs text-slate-400 text-center py-6">Type to search admin pages and posts</p>}

          {hasResults && filteredPages.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-slate-400 px-2 py-1 font-medium">Pages</p>
              {filteredPages.slice(0, 8).map(href => {
                const Icon = icons[href] || Search;
                const label = href.replace('/admin/', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Mission Control';
                return (
                  <a key={href} href={href} onClick={() => setOpen(false)} className="flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-dark-border text-sm text-slate-700 dark:text-dark-text">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span>{label}</span>
                  </a>
                );
              })}
            </div>
          )}

          {hasResults && filteredPosts.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 px-2 py-1 font-medium">Posts</p>
              {filteredPosts.slice(0, 8).map(p => (
                <a key={p.slug} href={`/posts/${p.slug}`} target="_blank" onClick={() => setOpen(false)} className="flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-dark-border text-sm text-slate-700 dark:text-dark-text">
                  <ExternalLink className="w-4 h-4 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <span className="truncate block">{p.title || p.slug}</span>
                    {p.category && <span className="text-xs text-slate-400">{p.category}</span>}
                  </div>
                  {p.draft && <span className="text-xs text-amber-500 font-medium">Draft</span>}
                </a>
              ))}
            </div>
          )}

          {hasResults && filteredPages.length === 0 && filteredPosts.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-6">No results for "{query}"</p>
          )}
        </div>
      </div>
    </div>
  );
}

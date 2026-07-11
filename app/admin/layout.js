'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminSearch from '@/components/AdminSearch';
import { ToastProvider } from '@/components/Toast';
import { useAdminShortcuts } from '@/hooks/useAdminShortcuts';
import {
  Cpu, FileText, ListTodo, Search, BarChart3, Crosshair, TrendingUp, Lightbulb, BookOpen, Link2, Rocket, Play, MessageSquare, Calendar, PenSquare, ArrowUp, Hash, Mail, RefreshCw, Activity, ShoppingCart, ClipboardList, Tag, Eye, CalendarDays, Database, GripVertical, DollarSign,
} from 'lucide-react';
import Link from 'next/link';

const navItems = [
  { href: '/admin', label: 'Mission Control', icon: Cpu },
  { href: '/admin/analytics', label: 'Analytics', icon: TrendingUp },
  { href: '/admin/stats', label: 'Stats', icon: BarChart3 },
  { href: '/admin/performance', label: 'Performance', icon: TrendingUp },
  { href: '/admin/posts', label: 'Posts', icon: FileText },
  { href: '/admin/content-audit', label: 'Audit', icon: ClipboardList },
  { href: '/admin/content-pipeline', label: 'Pipeline', icon: GripVertical },
  { href: '/admin/queue', label: 'Queue', icon: ListTodo },
  { href: '/admin/seo', label: 'SEO', icon: Search },
  { href: '/admin/search', label: 'Search', icon: Search },
  { href: '/admin/seo-preview', label: 'SEO Preview', icon: Eye },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/content-gaps', label: 'Content Gaps', icon: Crosshair },
  { href: '/admin/content-brief', label: 'Content Brief', icon: Lightbulb },
  { href: '/admin/calendar', label: 'Calendar', icon: Calendar },
  { href: '/admin/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/admin/series', label: 'Series', icon: BookOpen },
  { href: '/admin/bulk-edit', label: 'Bulk Edit', icon: PenSquare },
  { href: '/admin/links', label: 'Links', icon: Link2 },
  { href: '/admin/deploy', label: 'Deploy', icon: Rocket },
  { href: '/admin/actions', label: 'Actions', icon: Play },
  { href: '/admin/backup', label: 'Backup', icon: Database },
  { href: '/admin/upgrade', label: 'Upgrade', icon: ArrowUp },
  { href: '/admin/writer', label: 'Writer', icon: PenSquare },
  { href: '/admin/ai-chat', label: 'AI Chat', icon: MessageSquare },
  { href: '/admin/tags', label: 'Tags', icon: Hash },
  { href: '/admin/categories', label: 'Categories', icon: Tag },
  { href: '/admin/newsletter', label: 'Newsletter', icon: Mail },
  { href: '/admin/content-refresh', label: 'Refresh', icon: RefreshCw },
  { href: '/admin/workflows', label: 'Workflows', icon: Activity },
  { href: '/admin/activity', label: 'Activity Log', icon: Activity },

  { href: '/admin/social-scheduler', label: 'Social', icon: Calendar },
  { href: '/admin/seo-meta', label: 'SEO Meta', icon: Search },
  { href: '/admin/affiliates', label: 'Affiliates', icon: ShoppingCart },
  { href: '/admin/affiliate-links', label: 'Link Tracker', icon: DollarSign },
  { href: '/admin/site-health', label: 'Health', icon: Activity },
  { href: '/admin/visits', label: 'Visits', icon: Eye },
];

function AdminShell({ children }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { helpOpen, setHelpOpen, shortcuts: shortcutMap } = useAdminShortcuts();

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  useEffect(() => {
    if (status === 'unauthenticated' && pathname !== '/admin/login') {
      router.push('/admin/login');
    }
  }, [status, pathname, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg">
        <div className="animate-spin w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return children;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg flex">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-dark-card border-r border-slate-200 dark:border-dark-border flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-slate-200 dark:border-dark-border">
          <div className="flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">AI</span>
              </div>
              <div>
                <div className="font-heading font-bold text-sm leading-tight text-slate-900 dark:text-dark-text">Admin</div>
                <div className="text-xs text-slate-500 dark:text-dark-muted leading-tight">Dashboard</div>
              </div>
            </Link>
          </div>
          <div
            onClick={() => { const ev = new KeyboardEvent('keydown', { metaKey: true, key: 'k' }); window.dispatchEvent(ev); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-dark-border text-xs text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-dark-border/80 transition-colors"
          >
            <Search className="w-3 h-3" />
            <span className="hidden lg:inline">Search pages & posts...</span>
            <span className="lg:hidden">Search...</span>
            <kbd className="ml-auto text-[10px] text-slate-400 bg-white dark:bg-dark-card px-1 py-0.5 rounded border border-slate-200 dark:border-dark-border">⌘K</kbd>
          </div>
          <AdminSearch />
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400'
                    : 'text-slate-600 dark:text-dark-muted hover:bg-slate-100 dark:hover:bg-dark-border'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-200 dark:border-dark-border">
          <div className="text-[10px] text-slate-400 text-center mb-2">Press <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-dark-border font-mono">?</kbd> for shortcuts</div>
          <div className="flex items-center gap-3 px-3 py-2">
            {session?.user?.image && (
              <img src={session.user.image} alt="" className="w-8 h-8 rounded-full" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 dark:text-dark-text truncate">
                {session?.user?.name}
              </div>
              <div className="text-xs text-slate-500 dark:text-dark-muted truncate">
                {session?.user?.email}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto min-w-0">
        {/* Mobile header */}
        <div className="sticky top-0 z-20 lg:hidden bg-white dark:bg-dark-card border-b border-slate-200 dark:border-dark-border px-4 py-2 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-border text-slate-600 dark:text-dark-muted">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="text-sm font-bold text-slate-900 dark:text-dark-text">Admin Dashboard</div>
        </div>
        <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Keyboard shortcuts help */}
      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setHelpOpen(false)}>
          <div className="fixed inset-0 bg-black/40" />
          <div className="relative bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl shadow-2xl p-5 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text">Keyboard Shortcuts</h2>
              <button onClick={() => setHelpOpen(false)} className="text-slate-400 hover:text-slate-600"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="space-y-1">
              {Object.entries(shortcutMap).map(([key, s]) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-dark-muted">{s.label}</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-dark-border text-slate-500 font-mono text-[10px]">{key}</kbd>
                </div>
              ))}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-dark-border mt-2">
                <span className="text-slate-600 dark:text-dark-muted">Search pages</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-dark-border text-slate-500 font-mono text-[10px]">⌘K</kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminLayout({ children }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <AdminShell>{children}</AdminShell>
      </ToastProvider>
    </SessionProvider>
  );
}

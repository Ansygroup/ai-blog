'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  Cpu, FileText, ListTodo, Search, Link2, Rocket, Play,
} from 'lucide-react';
import Link from 'next/link';

const navItems = [
  { href: '/admin', label: 'Mission Control', icon: Cpu },
  { href: '/admin/posts', label: 'Posts', icon: FileText },
  { href: '/admin/queue', label: 'Queue', icon: ListTodo },
  { href: '/admin/seo', label: 'SEO', icon: Search },
  { href: '/admin/links', label: 'Links', icon: Link2 },
  { href: '/admin/deploy', label: 'Deploy', icon: Rocket },
  { href: '/admin/actions', label: 'Actions', icon: Play },
];

function AdminShell({ children }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

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
      <aside className="w-64 shrink-0 bg-white dark:bg-dark-card border-r border-slate-200 dark:border-dark-border flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-dark-border">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">AI</span>
            </div>
            <div>
              <div className="font-heading font-bold text-sm leading-tight text-slate-900 dark:text-dark-text">Admin</div>
              <div className="text-xs text-slate-500 dark:text-dark-muted leading-tight">Dashboard</div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
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
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function AdminLayout({ children }) {
  return (
    <SessionProvider>
      <AdminShell>{children}</AdminShell>
    </SessionProvider>
  );
}

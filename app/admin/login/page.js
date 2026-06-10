'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LogIn } from 'lucide-react';

export default function AdminLoginPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) router.push('/admin');
  }, [session, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg">
      <div className="w-full max-w-sm mx-auto px-4">
        <div className="rounded-xl border border-slate-200 bg-white p-8 dark:bg-dark-card dark:border-dark-border shadow-sm text-center">
          <div className="w-14 h-14 mx-auto mb-4 bg-brand-600 rounded-2xl flex items-center justify-center">
            <span className="text-white font-bold text-xl">AI</span>
          </div>
          <h1 className="text-xl font-heading font-bold text-slate-900 dark:text-dark-text mb-1">
            Admin Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-dark-muted mb-8">
            AI Pulse Daily — Blog Management
          </p>
          <button
            onClick={() => signIn('github', { callbackUrl: '/admin' })}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Sign in with GitHub
          </button>
        </div>
      </div>
    </div>
  );
}

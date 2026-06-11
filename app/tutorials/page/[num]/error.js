'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-lg">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-dark-text mb-4">Something went wrong</h1>
        <p className="text-slate-600 dark:text-dark-muted mb-8">
          We couldn't load this page. It might not exist or the URL is incorrect.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/" className="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg transition">Home</Link>
          <Link href="/tutorials" className="bg-white dark:bg-dark-card border border-slate-300 dark:border-dark-border hover:border-blue-500 dark:hover:border-blue-400 font-semibold px-5 py-2.5 rounded-lg transition">All Tutorials</Link>
          <button onClick={() => reset()} className="bg-white dark:bg-dark-card border border-slate-300 dark:border-dark-border hover:border-blue-500 dark:hover:border-blue-400 font-semibold px-5 py-2.5 rounded-lg transition">Try again</button>
        </div>
      </div>
    </div>
  );
}

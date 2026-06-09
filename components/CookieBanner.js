'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem('cookie-consent', 'true');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
      <div className="max-w-5xl mx-auto bg-slate-900 dark:bg-dark-card border border-slate-700 dark:border-dark-border text-white rounded-xl shadow-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm text-slate-300 flex-1">
          We use cookies and similar technologies to improve your experience and show personalized ads.{' '}
          <Link href="/privacy" className="text-brand-400 hover:text-brand-300 underline underline-offset-2">Learn more</Link>
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={accept}
            className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition"
          >
            Accept
          </button>
          <button onClick={() => setVisible(false)} aria-label="Dismiss" className="p-2 hover:bg-slate-800 rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

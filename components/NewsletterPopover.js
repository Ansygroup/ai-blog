'use client';

import { useState, useEffect } from 'react';
import { X, Mail, Sparkles } from 'lucide-react';

export default function NewsletterPopover() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('newsletter-popover-dismissed');
    if (stored === 'true') return;
    setDismissed(false);

    let triggered = false;
    const handleScroll = () => {
      if (triggered) return;
      const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      if (scrollPercent > 0.4) {
        triggered = true;
        setVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function handleDismiss() {
    setVisible(false);
    localStorage.setItem('newsletter-popover-dismissed', 'true');
  }

  if (dismissed || !visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-slide-up">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-slate-200 dark:border-dark-border p-5 relative">
        <button
          onClick={handleDismiss}
          aria-label="Close"
          className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-dark-text hover:bg-slate-100 dark:hover:bg-dark-border transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-dark-text text-sm flex items-center gap-1.5">
              Free AI Brief
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </h3>
            <p className="text-xs text-slate-500 dark:text-dark-muted mt-1 leading-relaxed">
              The 5 biggest AI tool launches and deals every week. Zero spam.
            </p>
            <a
              href="#newsletter"
              onClick={handleDismiss}
              className="mt-3 inline-flex items-center gap-1 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
            >
              Subscribe Free
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
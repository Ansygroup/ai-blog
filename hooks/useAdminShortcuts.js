'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const shortcuts = {
  'g s': { label: 'Go to Stats', href: '/admin/stats' },
  'g p': { label: 'Go to Performance', href: '/admin/performance' },
  'g q': { label: 'Go to Queue', href: '/admin/queue' },
  'g a': { label: 'Go to Analytics', href: '/admin/analytics' },
  'g c': { label: 'Go to Calendar', href: '/admin/calendar' },
  'g b': { label: 'Go to Backup', href: '/admin/backup' },
  'g t': { label: 'Go to Tags', href: '/admin/tags' },
  'g l': { label: 'Go to Links', href: '/admin/links' },
  'g h': { label: 'Go to Site Health', href: '/admin/site-health' },
  'g e': { label: 'Go to SEO', href: '/admin/seo' },
  'g v': { label: 'Go to Visits', href: '/admin/visits' },
  '?': { label: 'Show keyboard shortcuts', action: 'toggle-help' },
};

export function useAdminShortcuts() {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);
  const [buffer, setBuffer] = useState('');

  useEffect(() => {
    function handler(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

      // Single key shortcuts
      if (e.key === '?') {
        e.preventDefault();
        setHelpOpen(o => !o);
        return;
      }
      if (e.key === 'Escape') {
        setHelpOpen(false);
        return;
      }
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        router.push('/admin/posts');
        return;
      }

      // g + key navigation
      if (e.key === 'g') {
        setBuffer('g');
        setTimeout(() => setBuffer(''), 1000);
        return;
      }
      if (buffer === 'g') {
        const seq = 'g ' + e.key;
        const s = shortcuts[seq];
        if (s?.href) {
          e.preventDefault();
          setBuffer('');
          router.push(s.href);
        }
        setBuffer('');
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [buffer, router]);

  return { helpOpen, setHelpOpen, shortcuts };
}

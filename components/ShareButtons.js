'use client';
import { MessageCircle, Globe, ExternalLink } from 'lucide-react';

export default function ShareButtons({ title, url }) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    { name: 'Twitter', href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`, icon: MessageCircle, color: 'hover:bg-sky-100 hover:text-sky-600 dark:hover:bg-sky-900/30 dark:hover:text-sky-400' },
    { name: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, icon: Globe, color: 'hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-400' },
    { name: 'Reddit', href: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`, icon: ExternalLink, color: 'hover:bg-orange-100 hover:text-orange-600 dark:hover:bg-orange-900/30 dark:hover:text-orange-400' },
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-500 dark:text-dark-muted mr-1">Share</span>
      {links.map((l) => (
        <a
          key={l.name}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share on ${l.name}`}
          className={`p-2 rounded-full text-slate-400 dark:text-dark-muted transition ${l.color}`}
        >
          <l.icon className="w-4 h-4" />
        </a>
      ))}
    </div>
  );
}

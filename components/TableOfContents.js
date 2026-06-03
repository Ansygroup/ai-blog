'use client';

import { useState, useEffect } from 'react';

export default function TableOfContents() {
  const [headings, setHeadings] = useState([]);
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const elements = document.querySelectorAll('.prose-blog h2, .prose-blog h3');
    const items = Array.from(elements).map((el) => ({
      id: el.id,
      text: el.textContent,
      level: el.tagName === 'H2' ? 2 : 3,
    }));
    setHeadings(items);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-80px 0px -80% 0px' }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  if (headings.length < 3) return null;

  return (
    <nav className="sticky top-24" aria-label="Table of contents">
      <h4 className="text-sm font-semibold text-slate-500 dark:text-dark-muted uppercase tracking-wide mb-3">On this page</h4>
      <ul className="space-y-1.5 text-sm border-l-2 border-slate-200 dark:border-dark-border pl-3">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={`block transition ${
                h.level === 3 ? 'pl-4' : ''
              } ${
                activeId === h.id
                  ? 'text-blue-600 dark:text-blue-400 font-medium border-l-2 -ml-3 pl-[10px] border-blue-600 dark:border-blue-400'
                  : 'text-slate-600 dark:text-dark-muted hover:text-slate-900 dark:hover:text-dark-text'
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

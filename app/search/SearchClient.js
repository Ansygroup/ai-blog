'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SearchClient({ index }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    const q = query.toLowerCase().trim();
    if (!q) { setResults([]); return; }
    const timer = setTimeout(() => {
      setResults(
        index.filter(p =>
          (p.title + ' ' + (p.excerpt || '') + ' ' + (p.tags || []).join(' '))
            .toLowerCase().includes(q)
        )
      );
    }, 200);
    return () => clearTimeout(timer);
  }, [query, index]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-extrabold mb-3">Search</h1>
      <p className="text-slate-600 mb-6">Find any review, comparison, or tutorial.</p>
      <input
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Type to search..."
        autoFocus
        className="w-full px-4 py-3 border border-slate-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none mb-6 bg-white dark:bg-dark-card text-slate-900 dark:text-dark-text"
      />
      <div className="space-y-3">
        {results.length === 0 && query.trim() ? (
          <p className="text-slate-500 dark:text-dark-muted">No results found.</p>
        ) : query.trim() && (
          results.map(p => (
            <Link key={p.slug} href={`/posts/${p.slug}`}
              className="block p-4 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition"
            >
              <div className="text-xs text-slate-500 dark:text-dark-muted mb-1">
                {p.category} · {new Date(p.date).toLocaleDateString()}
              </div>
              <div className="font-semibold text-lg">{p.title}</div>
              {p.excerpt && <div className="text-sm text-slate-600 dark:text-dark-text mt-1">{p.excerpt}</div>}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

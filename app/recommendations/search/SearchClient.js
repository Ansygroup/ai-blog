'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import ProductCard from '../../../components/ProductCard';

export default function SearchClient() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');

  const db = typeof document !== 'undefined' ? JSON.parse(document.getElementById('amazon-db-data')?.textContent || '{}') : { categories: {} };
  const entries = Object.entries(db.categories || {});
  const allProducts = entries.flatMap(([, cat]) => cat.products);

  const categories = entries.map(([slug]) => slug);

  const filtered = useMemo(() => {
    let result = allProducts;
    if (category !== 'all') result = result.filter(p => p.category === category);
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.highlights || []).some(h => h.toLowerCase().includes(q)) ||
        (p.features && Object.values(p.features).some(v => String(v).toLowerCase().includes(q)))
      );
    }
    return result;
  }, [query, category]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <nav className="text-sm text-slate-500 dark:text-dark-muted mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2">
          <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
          <li>/</li>
          <li><Link href="/recommendations" className="hover:text-blue-600">Tech Store</Link></li>
          <li>/</li>
          <li className="text-slate-700 dark:text-dark-text">Search</li>
        </ol>
      </nav>

      <h1 className="text-3xl font-extrabold mb-6">🔍 Product Search</h1>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, description, or feature..."
          className="flex-1 px-4 py-3 border border-slate-300 dark:border-dark-border rounded-xl bg-white dark:bg-dark-card text-slate-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-3 border border-slate-300 dark:border-dark-border rounded-xl bg-white dark:bg-dark-card text-slate-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All ({allProducts.length})</option>
          {categories.map(c => <option key={c} value={c}>{c} ({entries.find(([s]) => s === c)?.[1].products.length || 0})</option>)}
        </select>
      </div>

      {!query && category === 'all' && (
        <p className="text-slate-500 dark:text-dark-muted mb-4">Browse all {allProducts.length} products or type to search.</p>
      )}

      {filtered.length === 0 && (query || category !== 'all') && (
        <p className="text-slate-500 dark:text-dark-muted mb-4">No products match your search.</p>
      )}

      {query && <p className="text-sm text-slate-500 dark:text-dark-muted mb-4">{filtered.length} result{filtered.length !== 1 ? 's' : ''} for &quot;{query}&quot;{category !== 'all' ? ` in ${category}` : ''}</p>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(p => <ProductCard key={p.asin} product={p} />)}
      </div>
    </div>
  );
}

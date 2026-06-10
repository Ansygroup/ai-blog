'use client';

import { useState, useEffect } from 'react';
import SeoChart from '@/components/admin/seo-chart';
import { Search } from 'lucide-react';

export default function AdminSeoPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/admin/api/seo')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">
            SEO Analytics
          </h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">
          Search engine optimization scores across all posts
        </p>
      </div>
      <SeoChart data={data} loading={loading} />
    </div>
  );
}

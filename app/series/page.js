import Link from 'next/link';
import { getAllSeries } from '../../lib/series';
import { BookOpen, ChevronRight, ArrowRight } from 'lucide-react';

export const metadata = { title: 'Post Series', description: 'Browse curated series of blog posts' };

export default function SeriesPage() {
  const seriesList = getAllSeries();
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">Post Series</h1>
        <p className="text-lg text-slate-600">Curated collections of related posts for deeper reading</p>
      </div>
      <div className="space-y-4">
        {seriesList.map((s) => (
          <Link key={s.slug} href={`/series/${s.slug}`}
            className="block rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-6 hover:shadow-md transition group">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/20 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-slate-900 dark:text-dark-text group-hover:text-brand-600 transition">{s.title}</h2>
                <p className="text-sm text-slate-600 dark:text-dark-muted mt-1">{s.description}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                  <span>{s.posts.length} articles</span>
                  {s.category && <span>· {s.category}</span>}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand-600 transition shrink-0 mt-2" />
            </div>
          </Link>
        ))}
      </div>
      {seriesList.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3" />
          <p className="text-lg">No series yet</p>
        </div>
      )}
    </div>
  );
}

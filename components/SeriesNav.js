import Link from 'next/link';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';

export default function SeriesNav({ navigation }) {
  if (!navigation || navigation.length === 0) return null;

  return (
    <>
      {navigation.map((nav) => (
        <div key={nav.series.slug} className="mt-10 pt-6 border-t border-slate-200 dark:border-dark-border">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-brand-600" />
            <span className="text-xs font-semibold text-slate-500 dark:text-dark-muted uppercase tracking-wider">
              Part of <Link href={`/series/${nav.series.slug}`} className="text-brand-600 dark:text-brand-400 hover:underline">{nav.series.title}</Link>
            </span>
            <span className="text-xs text-slate-400 ml-auto">Part {nav.index + 1} of {nav.total}</span>
          </div>
          {nav.total > 1 && (
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                {nav.prev && (
                  <Link href={`/posts/${nav.prev.slug}`} className="group block text-left">
                    <span className="text-xs text-slate-500 dark:text-dark-muted uppercase tracking-wider"><ChevronLeft className="w-3 h-3 inline" /> Previous in series</span>
                    <span className="block text-sm font-semibold text-slate-700 dark:text-dark-text group-hover:text-brand-600 transition truncate">{nav.prev.title}</span>
                  </Link>
                )}
              </div>
              <div className="flex-1 text-right">
                {nav.next && (
                  <Link href={`/posts/${nav.next.slug}`} className="group block text-right">
                    <span className="text-xs text-slate-500 dark:text-dark-muted uppercase tracking-wider">Next in series <ChevronRight className="w-3 h-3 inline" /></span>
                    <span className="block text-sm font-semibold text-slate-700 dark:text-dark-text group-hover:text-brand-600 transition truncate">{nav.next.title}</span>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

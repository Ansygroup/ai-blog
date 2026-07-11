import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSeriesWithPosts, getAllSeries } from '../../../lib/series';
import { siteConfig } from '../../../lib/config';
import { BookOpen, ChevronRight, Clock, ArrowRight } from 'lucide-react';
import Badge from '../../../components/ui/Badge';

export async function generateStaticParams() {
  return getAllSeries().map(s => ({ slug: s.slug }));
}

export function generateMetadata({ params }) {
  const series = getSeriesWithPosts(params.slug);
  if (!series) return {};
  return {
    title: `${series.title} - Post Series`,
    description: series.description,
    alternates: { canonical: `${siteConfig.url}/series/${series.slug}` },
  };
}

export default function SeriesDetailPage({ params }) {
  const series = getSeriesWithPosts(params.slug);
  if (!series) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <nav className="text-sm text-slate-500 mb-6">
        <ol className="flex items-center gap-2">
          <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
          <li><ChevronRight className="w-4 h-4 text-slate-300" /></li>
          <li><Link href="/series" className="hover:text-blue-600">Series</Link></li>
          <li><ChevronRight className="w-4 h-4 text-slate-300" /></li>
          <li className="text-slate-700 font-medium">{series.title}</li>
        </ol>
      </nav>

      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
          <BookOpen className="w-4 h-4" />
          <span>{series.posts.length} articles</span>
          {series.category && <><span>·</span><Badge>{series.category}</Badge></>}
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-3">{series.title}</h1>
        <p className="text-lg text-slate-600">{series.description}</p>
      </div>

      <div className="space-y-3">
        {series.posts.map((post, i) => (
          <Link key={post.slug} href={`/posts/${post.slug}`}
            className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-5 hover:shadow-md hover:border-brand-200 dark:hover:border-brand-800 transition group">
            <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/20 flex items-center justify-center text-sm font-bold text-brand-600 dark:text-brand-400 shrink-0">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-dark-text group-hover:text-brand-600 transition">{post.title}</h3>
              {post.excerpt && <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{post.excerpt}</p>}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0">
              {post.readingTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.readingTime} min</span>}
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand-600 transition" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

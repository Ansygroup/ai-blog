import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import { siteConfig } from '../../lib/config';
import { breadcrumbJsonLd } from '../../lib/schema';
import AmazonDisclosure from '../../components/AmazonDisclosure';
import { Search, Flame, ChevronRight, ArrowRight } from 'lucide-react';
import ProductCard from '../../components/ProductCard';

export const dynamic = 'force-static';

function getDb() {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts', 'amazon-db.json'), 'utf8'));
}

export const metadata = {
  title: 'Amazon Tech & AI Store — Best Deals 2026',
  description: 'Curated picks: best laptops, headphones, monitors, AI books, and creator gear. Every product hand-selected for AI professionals and creators.',
  alternates: { canonical: `${siteConfig.url}/recommendations` },
  openGraph: {
    title: 'Amazon Tech & AI Store — Best Deals 2026',
    description: 'Curated picks for AI professionals and creators.',
    url: `${siteConfig.url}/recommendations`,
    siteName: siteConfig.name,
    type: 'website',
  },
};

export default function RecommendationsPage() {
  const db = getDb();
  const entries = Object.entries(db.categories).filter(([, cat]) => cat.products?.length > 0);
  const allProducts = entries.flatMap(([slug, cat]) => cat.products.filter(p => p.slug && p.asin).map(p => ({ ...p, categorySlug: slug })));
  const featured = allProducts.sort((a, b) => (b.reviewsCount || 0) - (a.reviewsCount || 0)).slice(0, 4);

  return (
    <>
      <script id="ld-rec-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: siteConfig.url },
        { name: 'Tech Store', url: `${siteConfig.url}/recommendations` },
      ])) }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-sm text-slate-500 dark:text-dark-muted mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
            <li><ChevronRight className="w-4 h-4 text-slate-300" aria-hidden="true" /></li>
            <li className="text-slate-700 dark:text-dark-text">Tech Store</li>
          </ol>
        </nav>

        <header className="mb-10">
          <p className="text-sm text-slate-500 dark:text-dark-muted uppercase tracking-wider mb-2">Amazon Picks</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">AI & Tech Store</h1>
          <p className="text-lg text-slate-600 dark:text-dark-muted max-w-2xl">Curated tech products for AI professionals, developers, and creators. Every purchase supports independent reviews.</p>
        </header>

        <AmazonDisclosure featured />

        {/* Category buttons */}
        <div className="flex flex-wrap gap-3 mb-10">
          <Link href="/recommendations/search" className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:border-blue-500 px-4 py-2.5 rounded-xl transition group">
            <Search className="w-5 h-5 inline" />
            <span className="font-medium text-slate-900 dark:text-dark-text ml-1">Search Products</span>
          </Link>
          {entries.map(([slug, cat]) => (
            <Link key={slug} href={`/recommendations/${slug}`} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border hover:border-blue-500 px-4 py-2.5 rounded-xl transition group">
              <span className="font-medium text-slate-900 dark:text-dark-text">{cat.name.replace(/^[^\s]+\s/, '')}</span>
              <span className="text-xs text-slate-400 ml-1">({cat.products.length})</span>
            </Link>
          ))}
        </div>

        {/* Featured */}
        <section className="mb-12">
          <div className="flex items-center gap-2"><Flame className="w-5 h-5" /><h2 className="text-2xl font-bold mb-6">Most Popular</h2></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featured.map((p) => <ProductCard key={p.asin} product={p} />)}
          </div>
        </section>

        {/* By Category */}
        {entries.map(([slug, cat]) => (
          <section key={slug} className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{cat.name}</h2>
              <Link href={`/recommendations/${slug}`} className="text-sm text-blue-600 hover:underline">View all <ArrowRight className="w-4 h-4 inline" /></Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {cat.products.filter(p => p.slug && p.asin).slice(0, 4).map((p) => <ProductCard key={p.asin} product={p} />)}
            </div>
          </section>
        ))}

        <AmazonDisclosure />
      </div>
    </>
  );
}

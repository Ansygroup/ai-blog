import Link from 'next/link';
import { notFound } from 'next/navigation';
import fs from 'fs';
import path from 'path';
import { siteConfig } from '../../../lib/config';
import { breadcrumbJsonLd } from '../../../lib/schema';
import AmazonDisclosure from '../../../components/AmazonDisclosure';
import ProductCard from '../../../components/ProductCard';

export const dynamic = 'force-static';

function getDb() {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts', 'amazon-db.json'), 'utf8'));
}

export function generateStaticParams() {
  const db = getDb();
  return Object.keys(db.categories).map((slug) => ({ category: slug }));
}

export function generateMetadata({ params }) {
  const db = getDb();
  const cat = db.categories[params.category];
  if (!cat) return {};
  return {
    title: `${cat.name} — Best Deals 2026 | AI Pulse Daily`,
    description: cat.description,
    alternates: { canonical: `${siteConfig.url}/recommendations/${params.category}` },
    openGraph: {
      title: `${cat.name} — Best Deals 2026`,
      description: cat.description,
      url: `${siteConfig.url}/recommendations/${params.category}`,
      siteName: siteConfig.name,
      type: 'website',
    },
  };
}

function buildBuyingGuide(products, catName) {
  const prices = products.map(p => p.price).filter(Boolean);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const avgRating = products.length ? (products.reduce((s, p) => s + (p.rating || 0), 0) / products.length).toFixed(1) : '0.0';
  const topPick = products.length ? products.reduce((best, p) => (p.rating || 0) > (best.rating || 0) ? p : best) : null;
  const bestValue = products.length ? products.reduce((best, p) => {
    const score = (p.rating || 0) / (p.price || 1);
    const bestScore = (best.rating || 0) / (best.price || 1);
    return score > bestScore ? p : best;
  }) : null;

  const tags = products.flatMap(p => p.highlights || []).slice(0, 6);

  return { minPrice, maxPrice, avgRating, topPick, bestValue, tags };
}

function buildFAQ(catName) {
  return [
    { q: `What is the best ${catName} for most people?`, a: `The highest-rated option in our curated list offers the best balance of features, quality, and value for most users.` },
    { q: `How much should I spend on a ${catName}?`, a: `Our products range from $${catName === 'Office Chairs' ? '259' : '39'} to over $1,600. Mid-range options typically offer the best value.` },
    { q: `How often are these recommendations updated?`, a: `We review and update our product selections quarterly based on new releases, price changes, and user feedback.` },
    { q: `Are the prices shown accurate?`, a: `Prices are checked regularly but may change. Click through to Amazon for the current price.` },
    { q: `Do you earn from purchases?`, a: `Yes — as Amazon Associates we earn from qualifying purchases at no extra cost to you.` },
  ];
}

export default function CategoryPage({ params }) {
  const db = getDb();
  const cat = db.categories[params.category];
  if (!cat) notFound();

  const products = (cat.products || []).filter(p => p.slug && p.asin);
  const guide = buildBuyingGuide(products, cat.name);
  const faqs = buildFAQ(cat.name);
  const catName = cat.name.replace(/^[^\s]+\s/, '');

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: cat.name,
    description: cat.description,
    url: `${siteConfig.url}/recommendations/${params.category}`,
    about: { '@type': 'Thing', name: catName },
    numberOfItems: products.length,
  };

  return (
    <>
      <script id="ld-cat-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: siteConfig.url },
        { name: 'Tech Store', url: `${siteConfig.url}/recommendations` },
        { name: cat.name, url: `${siteConfig.url}/recommendations/${params.category}` },
      ])) }} />
      <script id="ld-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script id="ld-collection" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-sm text-slate-500 dark:text-dark-muted mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
            <li>/</li>
            <li><Link href="/recommendations" className="hover:text-blue-600">Tech Store</Link></li>
            <li>/</li>
            <li className="text-slate-700 dark:text-dark-text truncate max-w-[250px]">{cat.name}</li>
          </ol>
        </nav>

        <header className="mb-8">
          <p className="text-sm text-slate-500 dark:text-dark-muted uppercase tracking-wider mb-2">{cat.name.split(' ')[0]}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">{cat.name}</h1>
          <p className="text-lg text-slate-600 dark:text-dark-muted max-w-2xl">{cat.description}</p>
        </header>

        {/* Buying Guide Summary */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-dark-card dark:to-dark-bg border border-blue-200 dark:border-dark-border rounded-xl p-6 mb-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h2 className="font-bold text-lg mb-3">📊 Buying Guide</h2>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">•</span> <span><strong>Price range:</strong> ${guide.minPrice} — ${guide.maxPrice}</span></li>
                <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">•</span> <span><strong>Average rating:</strong> {guide.avgRating} / 5.0 across {products.length} products</span></li>
                {guide.topPick && <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">•</span> <span><strong>Top rated:</strong> {guide.topPick.name} ({guide.topPick.rating}★)</span></li>}
                {guide.bestValue && <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">•</span> <span><strong>Best value:</strong> {guide.bestValue.name} at ${guide.bestValue.price}</span></li>}
              </ul>
            </div>
            <div>
              <h2 className="font-bold text-lg mb-3">🏷️ Key Features to Consider</h2>
              <ul className="space-y-2 text-sm">
                {guide.tags.slice(0, 5).map((t, i) => (
                  <li key={i} className="flex items-start gap-2"><span className="text-green-500 font-bold">✓</span> <span>{t}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <AmazonDisclosure featured />

        {products.length === 0 ? (
          <div className="bg-yellow-50 dark:bg-dark-card border border-yellow-200 dark:border-dark-border rounded-xl p-6 text-center">
            <p className="text-lg font-semibold mb-2">🔄 Products loading</p>
            <p className="text-slate-600 dark:text-dark-muted">We're updating our product database. Check back soon for curated recommendations.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => <ProductCard key={p.asin} product={p} />)}
          </div>
        )}

        {/* FAQ */}
        <section className="mt-12 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <details key={i} className="bg-white dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-lg p-4 group">
                <summary className="font-semibold cursor-pointer flex justify-between items-center text-slate-900 dark:text-dark-text">
                  {f.q}
                  <span className="text-blue-600 group-open:rotate-45 transition text-2xl leading-none">+</span>
                </summary>
                <p className="mt-3 text-slate-700 dark:text-dark-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <div className="mt-12 text-center">
          <Link href="/recommendations" className="text-blue-600 hover:underline">← Back to all recommendations</Link>
        </div>

        <AmazonDisclosure />
      </div>
    </>
  );
}

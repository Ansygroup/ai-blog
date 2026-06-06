import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import { siteConfig } from '../../../lib/config';
import { breadcrumbJsonLd } from '../../../lib/schema';
import AmazonDisclosure from '../../../components/AmazonDisclosure';
import ProductCard from '../../../components/ProductCard';

export const dynamic = 'force-static';

const TAG = 'ansy07-20';
const STORE = 'aibolg-20';

function getDb() {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts', 'amazon-db.json'), 'utf8'));
}

export const metadata = {
  title: 'Best Amazon Products 2026 — Top Picks Across All Categories',
  description: 'Our top-rated picks across laptops, headphones, monitors, AI books, webcams, tablets, smart home, storage, keyboards, and office chairs. Updated for 2026.',
  alternates: { canonical: `${siteConfig.url}/recommendations/best` },
  openGraph: {
    title: 'Best Amazon Products 2026 — Top Picks',
    description: 'Curated top-rated tech picks for AI professionals.',
    url: `${siteConfig.url}/recommendations/best`,
    siteName: siteConfig.name,
    type: 'website',
  },
};

export default function BestPage() {
  const db = getDb();
  const entries = Object.entries(db.categories);
  const allProducts = entries.flatMap(([slug, cat]) => cat.products.filter(p => p.slug && p.asin).map(p => ({ ...p, category: cat.name, categorySlug: slug })));
  const byScore = [...allProducts].sort((a, b) => {
    const aScore = (a.rating || 0) * Math.log10((a.reviewsCount || 1) + 1);
    const bScore = (b.rating || 0) * Math.log10((b.reviewsCount || 1) + 1);
    return bScore - aScore;
  });
  const top10 = byScore.slice(0, 10);

  return (
    <>
      <script id="ld-best-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: siteConfig.url },
        { name: 'Tech Store', url: `${siteConfig.url}/recommendations` },
        { name: 'Best Products 2026', url: `${siteConfig.url}/recommendations/best` },
      ])) }} />
      <script id="ld-best-collection" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Best Amazon Products 2026',
        description: 'Top-rated tech products across all categories.',
        url: `${siteConfig.url}/recommendations/best`,
        mainEntity: { '@type': 'ItemList', itemListElement: top10.map((p, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'Product', name: p.name, url: `${siteConfig.url}/recommendations/products/${p.slug}`, image: p.image, offers: { '@type': 'Offer', price: p.price, priceCurrency: 'USD' } } })) },
      }) }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-sm text-slate-500 dark:text-dark-muted mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
            <li>/</li>
            <li><Link href="/recommendations" className="hover:text-blue-600">Tech Store</Link></li>
            <li>/</li>
            <li className="text-slate-700 dark:text-dark-text">Best Products 2026</li>
          </ol>
        </nav>

        <header className="mb-10">
          <span className="text-sm text-amber-500 font-semibold uppercase tracking-wider mb-2 block">🏆 Top Picks</span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">Best Amazon Products 2026</h1>
          <p className="text-lg text-slate-600 dark:text-dark-muted max-w-3xl">We ranked every product in our store by rating and popularity to bring you the absolute best. These are the top-performing picks across laptops, headphones, monitors, AI books, and more.</p>
        </header>

        <AmazonDisclosure featured />

        {/* Comparison Table */}
        <section className="mb-12 overflow-x-auto">
          <h2 className="text-2xl font-bold mb-6">📊 Full Comparison</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-300 dark:border-dark-border">
                <th className="text-left py-3 px-2 font-bold">#</th>
                <th className="text-left py-3 px-2 font-bold">Product</th>
                <th className="text-left py-3 px-2 font-bold">Category</th>
                <th className="text-center py-3 px-2 font-bold">Rating</th>
                <th className="text-center py-3 px-2 font-bold">Reviews</th>
                <th className="text-center py-3 px-2 font-bold">Price</th>
                <th className="text-center py-3 px-2 font-bold">Buy</th>
              </tr>
            </thead>
            <tbody>
              {top10.map((p, i) => (
                <tr key={p.asin} className="border-b border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-card/50">
                  <td className="py-3 px-2 font-bold text-lg">{i + 1}</td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <img src={p.image} alt={p.name} width="48" height="48" className="w-12 h-12 object-contain rounded" />
                      <Link href={`/recommendations/products/${p.slug}`} className="font-medium hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2">
                        {p.name}
                      </Link>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <Link href={`/recommendations/${p.categorySlug}`} className="text-blue-600 dark:text-blue-400 hover:underline text-xs">
                      {p.category}
                    </Link>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="text-amber-500">{'★'.repeat(Math.round(p.rating || 0))}</span>
                    <span className="text-xs text-slate-400 ml-1">{p.rating}</span>
                  </td>
                  <td className="py-3 px-2 text-center text-slate-600 dark:text-dark-muted">{(p.reviewsCount || 0).toLocaleString()}</td>
                  <td className="py-3 px-2 text-center font-bold text-lg">${p.price}</td>
                  <td className="py-3 px-2 text-center">
                    <a href={`https://www.amazon.com/dp/${p.asin}?tag=${TAG}`} target="_blank" rel="noopener sponsored" className="inline-block bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold px-3 py-1.5 rounded-lg text-xs transition whitespace-nowrap">
                      Buy →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Product Cards */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">🔍 Detailed Look</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {top10.map((p) => <ProductCard key={p.asin} product={p} />)}
          </div>
        </section>

        {/* SEO Content */}
        <section className="max-w-3xl mx-auto space-y-6 text-slate-700 dark:text-dark-text mb-12">
          <h2 className="text-2xl font-bold">Why These Products?</h2>
          <p>We analyzed every product in our curated database — 66 items across 10 categories — and ranked them by a composite score that combines customer ratings with review volume. Products that appear here have proven their quality through thousands of verified customer reviews on Amazon.</p>
          <p>Our store focuses on gear that matters for AI professionals, developers, and creators: powerful laptops for model training, noise-cancelling headphones for deep work, high-res monitors for coding, and essential peripherals that boost productivity.</p>
          <h3 className="text-xl font-bold mt-8">How We Rank</h3>
          <p>Each product gets a score = rating × log₁₀(reviews + 1). This rewards products that are both highly rated AND widely reviewed, ensuring that niche products with few reviews don't outrank universally-loved staples.</p>
        </section>

        <AmazonDisclosure />
      </div>
    </>
  );
}

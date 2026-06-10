import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import fs from 'fs';
import path from 'path';
import { siteConfig } from '../../../../lib/config';
import { breadcrumbJsonLd } from '../../../../lib/schema';
import { getAllPosts } from '../../../../lib/posts';
import { formatPrice, priceValue } from '../../../../lib/formatPrice';
import { getProductImage } from '../../../../lib/productImages';
import { BookOpen, ChevronRight, ArrowLeft, ShoppingCart, Star, Dot } from 'lucide-react';
import ProductCard from '../../../../components/ProductCard';
import AmazonDisclosure from '../../../../components/AmazonDisclosure';

export const dynamic = 'force-static';

const TAG = process.env.AMAZON_ASSOCIATES_TAG || 'ansy07-20';

function getDb() {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts', 'amazon-db.json'), 'utf8'));
}

function getAllProducts() {
  const db = getDb();
  const all = [];
  for (const [catSlug, cat] of Object.entries(db.categories)) {
    for (const p of cat.products.filter(p => p.slug)) {
      all.push({ ...p, categorySlug: catSlug });
    }
  }
  return all;
}

export function generateStaticParams() {
  const products = getAllProducts();
  return products.filter((p) => p.slug).map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }) {
  const products = getAllProducts();
  const product = products.find((p) => p.slug === params.slug);
  if (!product) return {};
  return {
    title: `${product.name} — Price, Specs & Review 2026 | AI Pulse Daily`,
    description: product.description?.slice(0, 160),
    alternates: { canonical: `${siteConfig.url}/recommendations/products/${product.slug}` },
    openGraph: {
      title: `${product.name} — ${formatPrice(product.price)}`,
      description: product.description?.slice(0, 160),
      url: `${siteConfig.url}/recommendations/products/${product.slug}`,
      siteName: siteConfig.name,
      type: 'website',
      images: [{ url: getProductImage(product), width: 800, height: 800 }],
    },
  };
}

export default function ProductPage({ params }) {
  const products = getAllProducts();
  const product = products.find((p) => p.slug === params.slug);
  if (!product) notFound();

  const db = getDb();
  const category = db.categories[product.categorySlug];
  const relatedProducts = category.products.filter((p) => p.slug !== product.slug).slice(0, 4);
  const amazonUrl = `https://www.amazon.com/dp/${product.asin}?tag=${TAG}`;

  const allPosts = getAllPosts();
  const productTags = [product.categorySlug, product.name.split(' ').slice(0, 3).join(' ').toLowerCase()];
  const relatedArticles = allPosts.filter((p) => {
    const tags = (p.tags || []).map(t => t.toLowerCase());
    const cat = (p.category || '').toLowerCase();
    return tags.some(t => productTags.some(pt => t.includes(pt) || pt.includes(t))) || productTags.some(pt => cat.includes(pt));
  }).slice(0, 3);

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: getProductImage(product),
    mpn: product.asin,
    brand: { '@type': 'Brand', name: product.name.split(' ')[0] },
    aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating, reviewCount: product.reviewsCount, bestRating: 5 },
    offers: { '@type': 'Offer', price: priceValue(product.price), priceCurrency: 'USD', url: amazonUrl, availability: 'https://schema.org/InStock' },
    sku: product.asin,
  };



  return (
    <>
      <script id="ld-prod-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: siteConfig.url },
        { name: 'Tech Store', url: `${siteConfig.url}/recommendations` },
        { name: category.name, url: `${siteConfig.url}/recommendations/${product.categorySlug}` },
        { name: product.name, url: `${siteConfig.url}/recommendations/products/${product.slug}` },
      ])) }} />
      <script id="ld-product" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-sm text-slate-500 dark:text-dark-muted mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 flex-wrap">
            <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
            <li><ChevronRight className="w-4 h-4 text-slate-300" /></li>
            <li><Link href="/recommendations" className="hover:text-blue-600">Tech Store</Link></li>
            <li><ChevronRight className="w-4 h-4 text-slate-300" /></li>
            <li><Link href={`/recommendations/${product.categorySlug}`} className="hover:text-blue-600">{category.name}</Link></li>
            <li><ChevronRight className="w-4 h-4 text-slate-300" /></li>
            <li className="text-slate-700 dark:text-dark-text truncate max-w-[200px]">{product.name}</li>
          </ol>
        </nav>

        <div className="grid md:grid-cols-2 gap-8 mb-10">
          <div>
            <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-md"><Image src={getProductImage(product)} alt={product.name} fill className="object-contain" sizes="(max-width: 768px) 100vw, 50vw" priority /></div>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-dark-muted uppercase tracking-wider mb-1">{product.categorySlug}</p>
            <h1 className="text-3xl font-extrabold tracking-tight mb-3">{product.name}</h1>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-yellow-500 text-lg inline-flex gap-0.5">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`w-5 h-5 ${i < Math.round(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />)}</span>
              <span className="text-slate-600 dark:text-dark-muted text-sm">{product.rating} ({product.reviewsCount?.toLocaleString()} reviews)</span>
            </div>
            <p className="text-3xl font-bold text-blue-600 mb-4">{formatPrice(product.price)}</p>
            <p className="text-slate-700 dark:text-dark-text mb-6">{product.description}</p>

            {product.highlights && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Key Highlights</h3>
                <ul className="space-y-1">
                  {product.highlights.map((h, i) => <li key={i} className="flex items-start gap-2 text-sm"><Dot className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />{h}</li>)}
                </ul>
              </div>
            )}

            <a href={amazonUrl} target="_blank" rel="noopener sponsored" className="inline-block bg-amber-400 hover:bg-amber-500 text-black font-bold py-3 px-8 rounded-lg transition text-center w-full sm:w-auto">
              Buy on Amazon — {formatPrice(product.price)}
            </a>
            <p className="text-xs text-slate-400 mt-2">As an Amazon Associate we earn from qualifying purchases.</p>
          </div>
        </div>

        {product.features && Object.keys(product.features).length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">Technical Specifications</h2>
            <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl overflow-hidden">
              <table className="w-full">
                <tbody>
                  {Object.entries(product.features).map(([key, val], i) => (
                    <tr key={key} className={i % 2 === 0 ? 'bg-slate-50 dark:bg-dark-bg' : ''}>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-dark-muted w-1/3 border-b border-slate-100 dark:border-dark-border">{key}</td>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-dark-text border-b border-slate-100 dark:border-dark-border">{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {relatedProducts.length > 0 && (
          <section className="mb-10 pt-6 border-t border-slate-200 dark:border-dark-border">
            <h2 className="text-xl font-bold mb-4">Compare with Similar Products</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedProducts.map((p) => <ProductCard key={p.asin} product={p} />)}
            </div>
          </section>
        )}

        {relatedArticles.length > 0 && (
          <section className="mb-10 pt-6 border-t border-slate-200 dark:border-dark-border">
            <div className="flex items-center gap-2"><BookOpen className="w-5 h-5" /><h2 className="text-xl font-bold mb-4">Related Articles</h2></div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedArticles.map((p) => (
                <Link key={p.slug} href={p.category === 'AI News' ? `/news/${p.slug}` : `/posts/${p.slug}`} className="group bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-dark-border overflow-hidden hover:shadow-lg transition">
                  {p.cover && <div className="relative w-full aspect-video overflow-hidden"><Image src={p.cover} alt={p.title} fill className="object-cover group-hover:opacity-95 transition" sizes="(max-width: 768px) 100vw, 33vw" /></div>}
                  <div className="p-4">
                    <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-blue-600 transition">{p.title}</h3>
                    {p.excerpt && <p className="text-xs text-slate-500 dark:text-dark-muted mt-1 line-clamp-2">{p.excerpt}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="text-center">
          <Link href={`/recommendations/${product.categorySlug}`} className="text-blue-600 hover:underline"><ArrowLeft className="w-4 h-4 inline" /> Back to all {category.name}</Link>
        </div>

        <AmazonDisclosure />
      </div>
    </>
  );
}

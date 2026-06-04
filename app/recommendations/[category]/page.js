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

export default function CategoryPage({ params }) {
  const db = getDb();
  const cat = db.categories[params.category];
  if (!cat) notFound();

  return (
    <>
      <script id="ld-cat-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: siteConfig.url },
        { name: 'Tech Store', url: `${siteConfig.url}/recommendations` },
        { name: cat.name, url: `${siteConfig.url}/recommendations/${params.category}` },
      ])) }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-sm text-slate-500 dark:text-dark-muted mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
            <li>/</li>
            <li><Link href="/recommendations" className="hover:text-blue-600">Tech Store</Link></li>
            <li>/</li>
            <li className="text-slate-700 dark:text-dark-text">{cat.name}</li>
          </ol>
        </nav>

        <header className="mb-10">
          <p className="text-sm text-slate-500 dark:text-dark-muted uppercase tracking-wider mb-2">{cat.name.split(' ')[0]}</p>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">{cat.name}</h1>
          <p className="text-lg text-slate-600 dark:text-dark-muted max-w-2xl">{cat.description}</p>
        </header>

        <AmazonDisclosure featured />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cat.products.map((p) => <ProductCard key={p.asin} product={p} />)}
        </div>

        <div className="mt-12 text-center">
          <Link href="/recommendations" className="text-blue-600 hover:underline">← Back to all recommendations</Link>
        </div>

        <AmazonDisclosure />
      </div>
    </>
  );
}

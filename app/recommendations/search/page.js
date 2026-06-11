import fs from 'fs';
import path from 'path';
import { siteConfig } from '../../../lib/config';
import SearchClient from './SearchClient';

export const dynamic = 'force-static';

export const metadata = {
  title: 'Search Products — AI Pulse Daily Store',
  description: 'Search through our curated Amazon product catalog: laptops, headphones, monitors, AI books, and more.',
  openGraph: {
    title: "Search Recommendations — AI Pulse Daily",
    description: "Find the best AI tool recommendations tailored to your needs.",
    url: siteConfig.url + '/recommendations/search',
    siteName: siteConfig.name,
    type: 'website',
  },
};

export default function SearchPage() {
  const db = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts', 'amazon-db.json'), 'utf8'));
  const entries = Object.entries(db.categories || {});
  const allProducts = entries.flatMap(([slug, cat]) => cat.products.map(p => ({ ...p, categorySlug: slug })));
  return (
    <>
      <script id="amazon-db-data" type="application/json" dangerouslySetInnerHTML={{ __html: JSON.stringify(db) }} />
      <SearchClient initialProducts={allProducts} initialEntries={entries} />
    </>
  );
}

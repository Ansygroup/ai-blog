import fs from 'fs';
import path from 'path';
import SearchClient from './SearchClient';

export const dynamic = 'force-static';

export const metadata = {
  title: 'Search Products — AI Pulse Daily Store',
  description: 'Search through our curated Amazon product catalog: laptops, headphones, monitors, AI books, and more.',
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

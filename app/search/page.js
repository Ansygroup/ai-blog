import { getAllPosts } from '../../lib/posts';
import { siteConfig } from '../../lib/config';
import SearchClient from './SearchClient';

export const metadata = {
  title: 'Search AI Tools, Reviews & Tutorials',
  description: `Search ${getAllPosts().length}+ AI tool reviews, comparisons, and tutorials on ${siteConfig.name}.`,
  alternates: { canonical: `${siteConfig.url}/search` },
  openGraph: { url: `${siteConfig.url}/search` },
};

export default function SearchPage() {
  const index = getAllPosts().map(p => ({
    slug: p.slug, title: p.title, excerpt: p.excerpt, category: p.category, tags: p.tags || [], date: p.date,
  }));
  return <SearchClient index={index} />;
}

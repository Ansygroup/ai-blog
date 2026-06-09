import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllCategories, getPostsByCategory, getCategoryBySlug, slugify } from '../../../lib/posts';
import PostCard from '../../../components/PostCard';
import { siteConfig } from '../../../lib/config';
import { breadcrumbJsonLd } from '../../../lib/schema';
import AdSlot from '../../../components/AdSlot';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return getAllCategories().map((c) => ({ slug: slugify(c.name) }));
}

export function generateMetadata({ params }) {
  const name = getCategoryBySlug(params.slug);
  return { title: `${name} — AI Tools, Reviews & Guides`, description: `The best ${name.toLowerCase()} content: reviews, comparisons, and tutorials.` };
}

export default function CategoryPage({ params }) {
  const name = getCategoryBySlug(params.slug);
  const posts = getPostsByCategory(name);
  if (!posts.length) notFound();
  return (
    <>
      <script id="ld-category-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: siteConfig.url },
        { name: name, url: `${siteConfig.url}/category/${params.slug}` },
      ])) }} />
      <script id="ld-category" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${name} — AI Tools, Reviews & Guides`,
        description: `The best ${name.toLowerCase()} AI tool reviews, comparisons, and tutorials.`,
        url: `${siteConfig.url}/category/${params.slug}`,
        about: { '@type': 'Thing', name },
        publisher: { '@type': 'Organization', name: siteConfig.name, url: siteConfig.url },
      }) }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-sm text-slate-500 dark:text-dark-muted mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
            <li>/</li>
            <li className="text-slate-700 dark:text-dark-text capitalize">{name}</li>
          </ol>
        </nav>
        <header className="mb-10">
          <p className="text-sm text-slate-500 dark:text-dark-muted uppercase tracking-wider mb-2">Category</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3 capitalize">{name}</h1>
          <p className="text-lg text-slate-600 dark:text-dark-muted">{posts.length} article{posts.length !== 1 ? 's' : ''} in {name}</p>
        </header>
        <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((p, i) => <PostCard key={p.slug} post={p} index={i} />)}
        </div>
      </div>
    </>
  );
}

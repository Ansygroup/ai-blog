import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getAllCategories, getPostsByCategory, getCategoryBySlug, slugify } from '../../../lib/posts';
import PostCard from '../../../components/PostCard';
import { siteConfig } from '../../../lib/config';
import { breadcrumbJsonLd } from '../../../lib/schema';
import AdSlot from '../../../components/AdSlot';
import PaginationNav from '../../../components/PaginationNav';
import { CATEGORY_INFO } from '../../../lib/categoryInfo';

export const dynamic = 'force-static';

const POSTS_PER_PAGE = 24;

export function generateStaticParams() {
  return getAllCategories().map((c) => ({ slug: slugify(c.name) }));
}

export function generateMetadata({ params }) {
  const slug = params.slug;
  const name = getCategoryBySlug(slug);
  const info = CATEGORY_INFO[slug];
  return {
    title: info ? (info.seoTitle || info.title) : `${name}: AI Tools, Reviews and Guides`,
    description: info ? info.description : `${name} articles on AI tools: reviews, comparisons and tutorials.`,
    alternates: { canonical: siteConfig.url + '/category/' + slug },
    openGraph: {
      title: (CATEGORY_INFO[slug] ? CATEGORY_INFO[slug].title : name) + ' | AI Pulse Daily',
      description: CATEGORY_INFO[slug] ? CATEGORY_INFO[slug].description : `${name} articles on AI tools.`,
      url: siteConfig.url + '/category/' + slug,
      siteName: siteConfig.name,
      type: 'website',
    },
  };
}

export default function CategoryPage({ params }) {
  const name = getCategoryBySlug(params.slug);
  const info = CATEGORY_INFO[params.slug];
  const allCats = getAllCategories();
  const allPosts = getPostsByCategory(name);
  if (!allPosts.length) notFound();
  const posts = allPosts.slice(0, POSTS_PER_PAGE);
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  return (
    <>
      <script id="ld-category-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: siteConfig.url },
        { name: name, url: `${siteConfig.url}/category/${params.slug}` },
      ])) }} />
      <script id="ld-category" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: info ? info.title : name,
        description: info ? info.description : `${name} articles on AI tools.`,
        url: `${siteConfig.url}/category/${params.slug}`,
        about: { '@type': 'Thing', name },
        publisher: { '@type': 'Organization', name: siteConfig.name, url: siteConfig.url },
      }) }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-sm text-slate-500 dark:text-dark-muted mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
            <li><ChevronRight className="w-3.5 h-3.5 text-slate-300" aria-hidden="true" /></li>
            <li className="text-slate-700 dark:text-dark-text capitalize">{name}</li>
          </ol>
        </nav>
        <header className="mb-10">
          <p className="text-sm text-slate-500 dark:text-dark-muted uppercase tracking-wider mb-2">Category</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">{info ? info.title : name}</h1>
          <p className="text-lg text-slate-600 dark:text-dark-muted max-w-3xl">{info ? info.intro : `Articles in ${name}.`}</p>
          <p className="text-sm text-slate-500 dark:text-dark-muted mt-2">{allPosts.length} article{allPosts.length !== 1 ? 's' : ''}</p>
          <nav aria-label="Categories" className="flex flex-wrap gap-2 mt-4">
            {allCats.map((c) => (
              <Link key={c.name} href={`/category/${slugify(c.name)}`} className={`text-sm px-3 py-1 rounded-full border ${slugify(c.name) === params.slug ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900' : 'border-slate-300 dark:border-dark-border hover:border-slate-900'}`}>{(CATEGORY_INFO[slugify(c.name)] || {}).label || c.name} ({c.count})</Link>
            ))}
          </nav>
        </header>
        <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((p, i) => <PostCard key={p.slug} post={p} index={i} />)}
        </div>
        <PaginationNav currentPage={1} totalPages={totalPages} basePath={`/category/${params.slug}`} />
      </div>
    </>
  );
}

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllCategories, getPostsByCategory, getCategoryBySlug, slugify } from '../../../../../lib/posts';
import { siteConfig } from '../../../../../lib/config';
import { breadcrumbJsonLd } from '../../../../../lib/schema';
import AdSlot from '../../../../../components/AdSlot';
import PostCard from '../../../../../components/PostCard';
import PaginationNav from '../../../../../components/PaginationNav';

export const dynamic = 'force-static';

const POSTS_PER_PAGE = 24;

export function generateStaticParams() {
  const categories = getAllCategories();
  const params = [];
  for (const cat of categories) {
    const posts = getPostsByCategory(cat.name);
    const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
    for (let i = 2; i <= totalPages; i++) {
      params.push({ slug: slugify(cat.name), num: String(i) });
    }
  }
  return params;
}

export function generateMetadata({ params }) {
  const name = getCategoryBySlug(params.slug);
  const num = Number(params.num);
  return {
    title: `${name} — Page ${num} | AI Tools, Reviews & Guides`,
    description: `The best ${name.toLowerCase()} content — page ${num}.`,
    alternates: { canonical: `${siteConfig.url}/category/${params.slug}/page/${num}` },
    openGraph: {
      title: `${name} (Page ${num}) — AI Pulse Daily`,
      description: `Best AI tools, reviews and tutorials in ${name} (Page ${num}). Expert-curated content updated daily.`,
      url: siteConfig.url + '/category/' + params.slug + '/page/' + num,
      siteName: siteConfig.name,
      type: 'website',
    },
  };
}

export default function CategoryPageNum({ params }) {
  const name = getCategoryBySlug(params.slug);
  const num = Number(params.num);
  if (!num || num < 2) notFound();

  const allPosts = getPostsByCategory(name);
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  if (num > totalPages) notFound();

  const start = (num - 1) * POSTS_PER_PAGE;
  const posts = allPosts.slice(start, start + POSTS_PER_PAGE);

  return (
    <>
      <script id="ld-category-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: siteConfig.url },
        { name: name, url: `${siteConfig.url}/category/${params.slug}` },
        { name: `Page ${num}`, url: `${siteConfig.url}/category/${params.slug}/page/${num}` },
      ])) }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-sm text-slate-500 dark:text-dark-muted mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
            <li>/</li>
            <li><Link href={`/category/${params.slug}`} className="hover:text-blue-600 capitalize">{name}</Link></li>
            <li>/</li>
            <li className="text-slate-700 dark:text-dark-text">Page {num}</li>
          </ol>
        </nav>
        <header className="mb-10">
          <p className="text-sm text-slate-500 dark:text-dark-muted uppercase tracking-wider mb-2">Category</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3 capitalize">{name} — Page {num}</h1>
          <p className="text-lg text-slate-600 dark:text-dark-muted">{allPosts.length} article{allPosts.length !== 1 ? 's' : ''} in {name}</p>
        </header>
        <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((p, i) => <PostCard key={p.slug} post={p} index={i} />)}
        </div>
        <PaginationNav currentPage={num} totalPages={totalPages} basePath={`/category/${params.slug}`} />
      </div>
    </>
  );
}
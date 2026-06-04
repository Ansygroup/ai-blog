import { notFound } from 'next/navigation';
import { getAllCategories, getPostsByCategory, getCategoryBySlug, slugify } from '../../../lib/posts';
import PostCard from '../../../components/PostCard';
import { siteConfig } from '../../../lib/config';
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header className="mb-10">
        <p className="text-sm text-slate-500 uppercase tracking-wider mb-2">Category</p>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3 capitalize">{name}</h1>
        <p className="text-lg text-slate-600">{posts.length} article{posts.length !== 1 ? 's' : ''} in {name}</p>
      </header>
      <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((p) => <PostCard key={p.slug} post={p} />)}
      </div>
    </div>
  );
}

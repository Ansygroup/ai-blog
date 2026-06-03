import { getAllPosts } from '../../lib/posts';
import PostCard from '../../components/PostCard';
import { siteConfig } from '../../lib/config';
import AdSlot from '../../components/AdSlot';

export const metadata = {
  title: 'All AI Tool Reviews, Tutorials & Comparisons — 2026',
  description: `Browse ${getAllPosts().length}+ in-depth AI tool reviews, step-by-step tutorials, and side-by-side comparisons. Updated weekly.`,
  alternates: { canonical: `${siteConfig.url}/reviews` },
  openGraph: { url: `${siteConfig.url}/reviews` },
};

export default function ReviewsPage() {
  const posts = getAllPosts();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header className="mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">All Reviews & Articles</h1>
        <p className="text-lg text-slate-600 max-w-2xl">Every review, comparison, and tutorial we've published. Filter by category to find what you need.</p>
      </header>
      <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((p) => <PostCard key={p.slug} post={p} />)}
      </div>
    </div>
  );
}

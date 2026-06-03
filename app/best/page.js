import { getAllPosts } from '../../lib/posts';
import PostCard from '../../components/PostCard';
import { siteConfig } from '../../lib/config';
import AdSlot from '../../components/AdSlot';

export const metadata = {
  title: 'Best AI Tools 2026 — Curated Rankings & Reviews',
  description: 'Curated "best of" lists ranking the top AI tools in every category. Best AI writing tools, image generators, code assistants, and more.',
  alternates: { canonical: `${siteConfig.url}/best` },
  openGraph: { url: `${siteConfig.url}/best` },
};

export default function BestPage() {
  const posts = getAllPosts().filter((p) => p.category === 'Best Of');
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header className="mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">Best AI Tools 2026</h1>
        <p className="text-lg text-slate-600 max-w-2xl">Our curated rankings of the best AI tools in every category. Updated quarterly with fresh testing data.</p>
      </header>
      <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((p) => <PostCard key={p.slug} post={p} />)}
      </div>
    </div>
  );
}

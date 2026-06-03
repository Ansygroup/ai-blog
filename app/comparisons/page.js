import { getAllPosts } from '../../lib/posts';
import PostCard from '../../components/PostCard';
import { siteConfig } from '../../lib/config';
import AdSlot from '../../components/AdSlot';

export const metadata = {
  title: 'AI Tool Comparisons — Side-by-Side Reviews | AI Pulse Daily',
  description: 'In-depth side-by-side comparisons of the best AI tools. We test ChatGPT vs Claude vs Gemini, Jasper vs Copy.ai, and more.',
  alternates: { canonical: `${siteConfig.url}/comparisons` },
};

export default function ComparisonsPage() {
  const posts = getAllPosts().filter((p) => p.category === 'Comparisons');
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header className="mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">AI Tool Comparisons</h1>
        <p className="text-lg text-slate-600 max-w-2xl">Side-by-side comparisons of the top AI tools. We test them on the same tasks so you can pick the right one.</p>
      </header>
      <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((p) => <PostCard key={p.slug} post={p} />)}
      </div>
    </div>
  );
}

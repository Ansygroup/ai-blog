import { getAllPosts } from '../../lib/posts';
import PostCard from '../../components/PostCard';
import { siteConfig } from '../../lib/config';
import AdSlot from '../../components/AdSlot';

export const metadata = {
  title: 'AI Tutorials — Step-by-Step Guides | AI Pulse Daily',
  description: 'Step-by-step AI tutorials: how to use ChatGPT, Midjourney, Claude, and more. Practical guides for marketers, creators, and developers.',
  alternates: { canonical: `${siteConfig.url}/tutorials` },
};

export default function TutorialsPage() {
  const posts = getAllPosts().filter((p) => p.category === 'Tutorials');
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header className="mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">AI Tutorials</h1>
        <p className="text-lg text-slate-600 max-w-2xl">Step-by-step tutorials to help you master AI tools. From prompt engineering to building AI workflows.</p>
      </header>
      <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((p) => <PostCard key={p.slug} post={p} />)}
      </div>
    </div>
  );
}

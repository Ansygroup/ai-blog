import { notFound } from 'next/navigation';
import { getAllTags, getAllPosts } from '../../../lib/posts';
import PostCard from '../../../components/PostCard';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return getAllTags().map((t) => ({ slug: t.name.toLowerCase().replace(/\s+/g, '-') }));
}

export function generateMetadata({ params }) {
  const name = params.slug.replace(/-/g, ' ');
  return { title: `#${name} — AI Articles Tagged ${name}` };
}

export default function TagPage({ params }) {
  const tag = params.slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  const posts = getAllPosts().filter((p) => (p.tags || []).map((t) => t.toLowerCase()).includes(tag.toLowerCase()));
  if (!posts.length) notFound();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-extrabold mb-2">#{tag}</h1>
      <p className="text-slate-600 mb-8">{posts.length} article{posts.length !== 1 ? 's' : ''} tagged with "{tag}"</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((p) => <PostCard key={p.slug} post={p} />)}
      </div>
    </div>
  );
}

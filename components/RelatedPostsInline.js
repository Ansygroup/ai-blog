import PostCard from './PostCard';

export default function RelatedPostsInline({ posts }) {
  if (!posts || posts.length === 0) return null;
  return (
    <section className="mt-12 pt-8 border-t border-slate-200 dark:border-dark-border">
      <h2 className="text-2xl font-bold mb-6">You May Also Like</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.slice(0, 3).map((p, i) => (
          <PostCard key={p.slug} post={p} index={i} />
        ))}
      </div>
    </section>
  );
}

import Link from 'next/link';

export default function PostCard({ post }) {
  return (
    <article className="group bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-dark-border overflow-hidden hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition">
      {post.cover && (
        <Link href={`/posts/${post.slug}`} className="block aspect-video bg-slate-100 overflow-hidden">
          <img src={post.cover} alt={post.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
        </Link>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-dark-muted mb-2 flex-wrap">
          {post.category && <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">{post.category}</span>}
          <time dateTime={post.date}>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</time>
          {post.readingTime && <><span>·</span><span>{post.readingTime} min read</span></>}
          {post.lastUpdated && new Date(post.lastUpdated) > new Date(post.date) && <><span>·</span><span className="text-emerald-600 dark:text-emerald-400 font-medium">Updated</span></>}
        </div>
        <h3 className="text-xl font-bold mb-2 leading-snug">
          <Link href={`/posts/${post.slug}`} className="hover:text-blue-600 transition">{post.title}</Link>
        </h3>
        <p className="text-slate-600 text-sm line-clamp-3 mb-3">{post.excerpt || post.description}</p>
        <div className="flex items-center justify-between text-sm">
          <Link href={`/posts/${post.slug}`} className="text-blue-600 font-semibold group-hover:underline">
            Read review →
          </Link>
          {post.rating && <span className="text-amber-500 font-bold">{'★'.repeat(Math.round(post.rating))}{'☆'.repeat(5 - Math.round(post.rating))} {post.rating}</span>}
        </div>
      </div>
    </article>
  );
}

import Link from 'next/link';

export default function PostCard({ post }) {
  return (
    <article className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-blue-300 transition">
      {post.cover && (
        <Link href={`/posts/${post.slug}`} className="block aspect-video bg-slate-100 overflow-hidden">
          <img src={post.cover} alt={post.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
        </Link>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          {post.category && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">{post.category}</span>}
          <span>·</span>
          <time dateTime={post.date}>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</time>
          {post.readingTime && <><span>·</span><span>{post.readingTime} min read</span></>}
        </div>
        <h3 className="text-xl font-bold mb-2 leading-snug">
          <Link href={`/posts/${post.slug}`} className="hover:text-blue-600 transition">{post.title}</Link>
        </h3>
        <p className="text-slate-600 text-sm line-clamp-3 mb-3">{post.excerpt || post.description}</p>
        <div className="flex items-center justify-between text-sm">
          <Link href={`/posts/${post.slug}`} className="text-blue-600 font-semibold group-hover:underline">
            Read review →
          </Link>
          {post.rating && <span className="text-amber-500 font-bold">★ {post.rating}/5</span>}
        </div>
      </div>
    </article>
  );
}

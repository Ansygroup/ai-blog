import Link from 'next/link';
import Card from './ui/Card';
import Badge from './ui/Badge';
import { ArrowRight, Clock, Star } from 'lucide-react';

function postHref(post) {
  return post.category === 'AI News' ? `/news/${post.slug}` : `/posts/${post.slug}`;
}

export default function PostCard({ post, index = 0 }) {
  const href = postHref(post);
  const delay = Math.min((index % 6) * 100, 500);
  return (
    <article className={`animate-fade-in opacity-0 [animation-fill-mode:forwards]`} style={{ animationDelay: `${delay}ms` }}>
      <Card className="group h-full flex flex-col" as="article">
        {post.cover && (
          <Link href={href} className="block aspect-video bg-slate-100 overflow-hidden">
            <img src={post.cover} alt={post.title} loading="lazy" width="400" height="225" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
          </Link>
        )}
        <div className="p-5 flex-1 flex flex-col">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-dark-muted mb-2 flex-wrap">
            {post.category && <Badge>{post.category}</Badge>}
            <time dateTime={post.date}>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</time>
            {post.readingTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {post.readingTime} min read
              </span>
            )}
            {post.lastUpdated && new Date(post.lastUpdated) > new Date(post.date) && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Updated</span>
            )}
          </div>
          <h3 className="text-xl font-heading font-bold mb-2 leading-snug flex-1">
            <Link href={href} className="hover:text-brand-600 dark:hover:text-brand-400 transition">{post.title}</Link>
          </h3>
          <p className="text-slate-600 dark:text-dark-muted text-sm line-clamp-3 mb-3">{post.excerpt || post.description}</p>
          <div className="flex items-center justify-between text-sm mt-auto pt-3 border-t border-slate-100 dark:border-dark-border">
            <Link href={href} className="text-brand-600 dark:text-brand-400 font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all">
              Read {post.category === 'AI News' ? 'story' : 'review'}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            {post.rating && (
              <span className="flex items-center gap-1 text-amber-500 font-bold">
                <Star className="w-4 h-4 fill-current" />
                {post.rating}
              </span>
            )}
          </div>
        </div>
      </Card>
    </article>
  );
}

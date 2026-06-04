import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllTags, getAllPosts, slugify } from '../../../lib/posts';
import PostCard from '../../../components/PostCard';
import { siteConfig } from '../../../lib/config';
import { breadcrumbJsonLd } from '../../../lib/schema';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return getAllTags().map((t) => ({ slug: slugify(t.name) }));
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
    <>
      <script id="ld-tag-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: siteConfig.url },
        { name: `#${tag}`, url: `${siteConfig.url}/tag/${params.slug}` },
      ])) }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-sm text-slate-500 dark:text-dark-muted mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
            <li>/</li>
            <li className="text-slate-700 dark:text-dark-text">#{tag}</li>
          </ol>
        </nav>
        <h1 className="text-4xl font-extrabold mb-2">#{tag}</h1>
        <p className="text-slate-600 dark:text-dark-muted mb-8">{posts.length} article{posts.length !== 1 ? 's' : ''} tagged with &ldquo;{tag}&rdquo;</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((p) => <PostCard key={p.slug} post={p} />)}
        </div>
      </div>
    </>
  );
}

import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import fs from 'fs';
import path from 'path';
import { topics } from '../../../lib/topics';
import { getAllPosts } from '../../../lib/posts';
import { siteConfig } from '../../../lib/config';
import { breadcrumbJsonLd, faqJsonLd } from '../../../lib/schema';
import { formatPrice } from '../../../lib/formatPrice';
import { BookOpen, ShoppingCart } from 'lucide-react';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return topics.map((t) => ({ slug: t.slug }));
}

export function generateMetadata({ params }) {
  const topic = topics.find((t) => t.slug === params.slug);
  if (!topic) return {};
  return {
    title: `${topic.title} — Guides & Comparisons 2026`,
    description: topic.description,
    alternates: { canonical: `${siteConfig.url}/topics/${topic.slug}` },
    openGraph: {
      title: `${topic.title} 2026`,
      description: topic.description,
      url: `${siteConfig.url}/topics/${topic.slug}`,
      siteName: siteConfig.name,
      type: 'website',
    },
  };
}

export default function TopicPage({ params }) {
  const topic = topics.find((t) => t.slug === params.slug);
  if (!topic) notFound();

  const allPosts = getAllPosts();
  const lowerTags = topic.tags.map(t => t.toLowerCase());
  const relatedPosts = allPosts.filter(p => {
    const postTags = (p.tags || []).map(t => t.toLowerCase());
    const postCat = (p.category || '').toLowerCase();
    return postTags.some(t => lowerTags.includes(t)) || lowerTags.some(lt => postCat.includes(lt));
  });

  const dbPath = path.join(process.cwd(), 'scripts', 'amazon-db.json');
  let relatedProducts = [];
  try {
    const raw = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    const all = Object.entries(raw.categories).flatMap(([slug, c]) => c.products.map(p => ({ ...p, categorySlug: slug })));
    const catKeywords = topic.slug.replace('ai-', '').replace(/-/g, ' ');
    relatedProducts = all.filter(p => {
      const name = p.name.toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const cat = (p.categorySlug || '').toLowerCase();
      return name.includes(catKeywords) || desc.includes(catKeywords) || cat.includes(catKeywords);
    }).slice(0, 4);
  } catch (e) { /* no db */ }

  return (
    <>
      <script id="ld-topic-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: siteConfig.url },
        { name: 'Topics', url: `${siteConfig.url}/topics` },
        { name: topic.title, url: `${siteConfig.url}/topics/${topic.slug}` },
      ])) }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-sm text-slate-500 dark:text-dark-muted mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
            <li>/</li>
            <li><Link href="/topics" className="hover:text-blue-600">Topics</Link></li>
            <li>/</li>
            <li className="text-slate-700 dark:text-dark-text">{topic.title}</li>
          </ol>
        </nav>

        <header className="mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">{topic.title} <span className="text-blue-600">2026</span></h1>
          <p className="text-lg text-slate-600 dark:text-dark-muted max-w-3xl">{topic.description}</p>
        </header>

        {/* Articles */}
        <section className="mb-12">
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5" /><h2 className="text-2xl font-bold mb-6">Articles ({relatedPosts.length})</h2></div>
          {relatedPosts.length === 0 && <p className="text-slate-500">No articles yet for this topic.</p>}
          <div className="space-y-4">
            {relatedPosts.map((p, i) => (
              <Link key={p.slug} href={p.category === 'AI News' ? `/news/${p.slug}` : `/posts/${p.slug}`} className="block group bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-dark-border p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition">
                <div className="flex items-start gap-4">
                  <span className="text-slate-300 dark:text-dark-muted font-bold text-lg w-6 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-dark-text group-hover:text-blue-600 transition truncate">{p.title}</h3>
                    {p.excerpt && <p className="text-sm text-slate-500 dark:text-dark-muted mt-1 line-clamp-2">{p.excerpt}</p>}
                    <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-dark-muted mt-2">
                      {p.category && <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full">{p.category}</span>}
                      <time>{new Date(p.date).toLocaleDateString()}</time>
                      {p.readingTime && <span>{p.readingTime} min</span>}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Amazon products */}
        {relatedProducts.length > 0 && (
          <section className="mb-12 pt-6 border-t border-slate-200 dark:border-dark-border">
            <div className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /><h2 className="text-2xl font-bold mb-6">Recommended Gear</h2></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {relatedProducts.map(p => (
                <Link key={p.asin} href={`/recommendations/products/${p.slug}`} className="group bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-dark-border p-3 hover:shadow-md transition text-center">
                  {p.image ? <div className="relative w-full aspect-square mb-2"><Image src={p.image} alt={p.name} fill className="object-contain" sizes="(max-width: 640px) 50vw, 25vw" /></div> : <div className="relative w-full aspect-square mb-2 flex items-center justify-center bg-slate-100 dark:bg-dark-card rounded"><ShoppingCart className="w-5 h-5 text-slate-400" /></div>}
                  <h3 className="text-xs font-semibold line-clamp-2 group-hover:text-blue-600 transition">{p.name}</h3>
                  <p className="text-blue-600 font-bold text-sm mt-1">{formatPrice(p.price)}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="max-w-3xl mx-auto pt-6 border-t border-slate-200 dark:border-dark-border">
          <div className="text-center">
            <Link href="/topics" className="text-blue-600 hover:underline">← All Topics</Link>
          </div>
        </section>
      </div>
    </>
  );
}

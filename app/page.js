import Link from 'next/link';
import Image from 'next/image';
import fs from 'fs';
import path from 'path';
import { getAllPosts, getAllCategories, slugify } from '../lib/posts';
import { siteConfig } from '../lib/config';
import { breadcrumbJsonLd, faqJsonLd, organizationJsonLd } from '../lib/schema';
import PostCard from '../components/PostCard';
import ProductCard from '../components/ProductCard';
import AdSlot from '../components/AdSlot';
import Badge from '../components/ui/Badge';
import { Plus, Star, ArrowRight } from 'lucide-react';

export const dynamic = 'force-static';

export const metadata = {
  title: 'AI Pulse Daily — AI Tool Reviews, Comparisons & News',
  description: siteConfig.description,
  alternates: { canonical: siteConfig.url },
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    type: 'website',
  },
};

export default function HomePage() {
  const posts = getAllPosts();
  const featured = posts[0];
  const secondary = posts.slice(1, 4);
  const grid = posts.slice(4, 13);
  const categories = getAllCategories().slice(0, 8);

  const dbPath = path.join(process.cwd(), 'scripts', 'amazon-db.json');
  let topProducts = [];
  try {
    const raw = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    const all = Object.entries(raw.categories || {}).flatMap(([slug, cat]) => (cat.products || []).map(p => ({ ...p, categorySlug: slug })));
    topProducts = all.sort((a, b) => (b.reviews || 0) - (a.reviews || 0)).slice(0, 6);
  } catch (e) { /* no db */ }

  const homeFaqs = [
    { question: 'How do you test AI tools?', answer: 'We sign up for paid plans, run the same 10 real-world tasks across every tool, and rate output quality, speed, pricing, and support. Each review includes a transparent scoring rubric.' },
    { question: 'Do you use affiliate links?', answer: 'Yes — full disclosure on every page. Affiliate links fund our testing. We never accept payment to publish a positive review.' },
    { question: 'How often is content updated?', answer: 'Every "best of" list is re-tested quarterly. We add a "Last updated" date and revision log to every comparison so you can trust the data.' },
  ];

  return (
    <>
      {/* JSON-LD inline so it's in the initial SSR HTML (crawlers read raw HTML) */}
      <script id="ld-organization" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }} />
      <script id="ld-home" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([{ name: 'Home', url: siteConfig.url }])) }} />
      <script id="ld-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(homeFaqs)) }} />

      {/* HERO */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-brand-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-500/10 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center relative">
          <span className="inline-block bg-amber-400 text-slate-900 text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">Updated for 2026</span>
          <h1 className="text-4xl md:text-6xl font-heading font-extrabold mb-4 tracking-tight leading-tight">{siteConfig.tagline}</h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-8 font-body">
            We test every AI tool so you don't waste money. Independent reviews, side-by-side comparisons, and step-by-step tutorials.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/best" className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold px-6 py-3 rounded-lg transition active:scale-[0.97]">Best AI Tools 2026</Link>
            <Link href="/reviews" className="bg-white/10 hover:bg-white/20 backdrop-blur text-white font-semibold px-6 py-3 rounded-lg transition">All Reviews</Link>
          </div>
          <div className="flex justify-center gap-8 mt-12 text-sm text-slate-400">
            <div><span className="text-white font-bold text-lg">{posts.length}+</span><br />Articles</div>
            <div><span className="text-white font-bold text-lg">{categories.length}</span><br />Categories</div>
            <div><span className="text-white font-bold text-lg">Since 2024</span><br />Published</div>
          </div>
        </div>
      </section>

      {/* TOP CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((c) => (
            <Link key={c.name} href={`/category/${slugify(c.name)}`} className="whitespace-nowrap bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border hover:border-brand-500 dark:hover:border-brand-400 hover:text-brand-700 dark:hover:text-brand-400 px-4 py-2 rounded-full text-sm font-medium transition shrink-0">
              {c.name} <span className="text-slate-400">({c.count})</span>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED + SECONDARY */}
      {featured && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <h2 className="text-2xl font-heading font-bold mb-6">{featured.category === 'AI News' ? 'Latest News' : 'Featured Review'}</h2>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 group bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-dark-border overflow-hidden hover:shadow-xl transition">
              {featured.cover && <Link href={`/${featured.category === 'AI News' ? 'news' : 'posts'}/${featured.slug}`} className="block aspect-video relative overflow-hidden"><Image src={featured.cover} alt={featured.title} fill className="object-cover group-hover:scale-[1.02] transition duration-500" sizes="(max-width: 1024px) 100vw, 66vw" priority /></Link>}
              <div className="p-6">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                  {featured.category && <Badge>{featured.category}</Badge>}
                  <time>{new Date(featured.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</time>
                </div>
                <h3 className="text-3xl font-heading font-bold mb-3"><Link href={`/${featured.category === 'AI News' ? 'news' : 'posts'}/${featured.slug}`} className="hover:text-brand-600 dark:hover:text-brand-400 transition">{featured.title}</Link></h3>
                {featured.rating && <div className="flex items-center gap-2 mb-3"><span className="flex text-amber-400">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`w-5 h-5 ${i < Math.round(featured.rating) ? 'fill-current' : 'opacity-30'}`} />)}</span><span className="text-sm text-slate-500">{featured.rating}/5</span></div>}
                <p className="text-slate-600 dark:text-dark-text mb-4 font-body">{featured.excerpt}</p>
                <Link href={`/${featured.category === 'AI News' ? 'news' : 'posts'}/${featured.slug}`} className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">Read the full {featured.category === 'AI News' ? 'story' : 'review'} <ArrowRight className="w-4 h-4 inline" /></Link>
              </div>
            </div>
            <div className="space-y-4">
              {secondary.map((p, i) => <PostCard key={p.slug} post={p} index={i} />)}
            </div>
          </div>
        </section>
      )}

      {/* TOP PICKS FROM STORE */}
      {topProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-heading font-bold">Top Picks from Our Store</h2>
            <Link href="/recommendations" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline text-sm">Browse all products →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {topProducts.map((p) => (
              <ProductCard key={p.asin} product={p} />
            ))}
          </div>
        </section>
      )}

      <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP} />

      {/* LATEST GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h2 className="text-2xl font-heading font-bold mb-6">Latest Reviews & Tutorials</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {grid.map((p, i) => <PostCard key={p.slug} post={p} index={i} />)}
        </div>
        <div className="text-center mt-10">
          <Link href="/posts" className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-3 rounded-lg transition">View all articles</Link>
        </div>
      </section>

      <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_MID} />

      {/* Newsletter CTA */}
      <section id="newsletter" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-gradient-to-r from-brand-600 to-indigo-700 rounded-2xl p-8 md:p-12 text-center text-white">
          <h2 className="text-3xl font-heading font-bold mb-3">Get the Free AI Brief</h2>
          <p className="text-blue-100 text-lg mb-6 max-w-lg mx-auto font-body">The 5 biggest AI tool launches and deals every week. Zero spam, unsubscribe anytime.</p>
          <form action="https://app.convertkit.com/forms/6699069/subscriptions" method="post" target="_blank" className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input name="email_address" type="email" placeholder="your@email.com" required className="flex-1 px-4 py-3 rounded-lg text-slate-900 placeholder-slate-400 border-0 focus:ring-2 focus:ring-amber-400 focus:outline-none" />
            <button type="submit" className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold px-6 py-3 rounded-lg transition whitespace-nowrap active:scale-[0.97]">Subscribe Free</button>
          </form>
        </div>
      </section>

      {/* FAQ for AI engines (GEO) + humans */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-heading font-bold mb-8">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {homeFaqs.map((f, i) => (
            <details key={i} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-lg p-5 group open:ring-1 open:ring-brand-200 dark:open:ring-brand-800 transition">
              <summary className="font-semibold text-lg cursor-pointer flex justify-between items-center text-slate-900 dark:text-dark-text">
                {f.question}
                <Plus className="w-5 h-5 text-brand-600 dark:text-brand-400 group-open:rotate-45 transition shrink-0 ml-4" />
              </summary>
              <p className="mt-3 text-slate-700 dark:text-dark-text leading-relaxed font-body">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

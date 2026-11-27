import Link from 'next/link';
import Image from 'next/image';
import fs from 'fs';
import path from 'path';
import { getAllPosts, getAllCategories, slugify } from '../lib/posts';
import { siteConfig } from '../lib/config';
import { breadcrumbJsonLd, faqJsonLd, organizationJsonLd } from '../lib/schema';
import PostCard from '../components/PostCard';
import AdSlot from '../components/AdSlot';
import Badge from '../components/ui/Badge';
import { Plus, Star, ArrowRight } from 'lucide-react';
import { BEST_PICKS, BEST_UPDATED_LABEL } from '../lib/bestGuide';

export const dynamic = 'force-static';

export const metadata = {
  title: 'AI Pulse Daily: AI News, Tool Reviews and Price-Checked Comparisons',
  description: siteConfig.description,
  alternates: { canonical: siteConfig.url },
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    type: 'website',
  },
};

export default function HomePage() {
  const posts = getAllPosts();
  const categories = getAllCategories().slice(0, 8);

  // Category mix: the old layout took the N newest posts, so one prolific
  // template (e.g. "Best AI Tools X for Y") filled the whole homepage.
  // Feature each major section instead: news, comparisons, tutorials, reviews.
  const NEWS = ['AI News'];
  const CMP = ['Comparisons', 'Comparison'];
  const TUT = ['Tutorials', 'Tutorial', 'Guides'];
  const REV = ['Reviews', 'Review'];
  const used = new Set();
  const byCat = (cats, n) => {
    const picks = posts.filter((p) => cats.includes(p.category) && !p.noindex && !used.has(p.slug)).slice(0, n);
    picks.forEach((p) => used.add(p.slug));
    return picks;
  };

  const heroNews = posts.filter((p) => p.category === 'AI News' && !p.noindex).slice(0, 4);
  const newsTop = byCat(NEWS, 1);
  const featured = newsTop[0] || posts.find((p) => !p.noindex && !used.has(p.slug));
  if (featured) used.add(featured.slug);

  const secondary = [...byCat(CMP, 1), ...byCat(REV, 1)];
  for (const p of posts) {
    if (secondary.length >= 2) break;
    if (!used.has(p.slug)) { secondary.push(p); used.add(p.slug); }
  }

  const newsRow = byCat(NEWS, 3);
  const cmpRow = byCat(CMP, 3);
  const tutRow = byCat(TUT, 3);
  const grid = posts.filter((p) => !p.noindex && !used.has(p.slug)).slice(0, 9);

  const homeFaqs = [
    { question: 'How do you research AI tools?', answer: 'We research from vendor documentation, official pricing pages checked on the article date, and reputable public sources. When we run our own check (like confirming a free-tier limit), the article says exactly what we did. See How We Test for details.' },
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
      <section className="border-b border-slate-200 dark:border-dark-border bg-white dark:bg-dark-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20 grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-8 hero-in">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold tracking-tight leading-[1.05] text-slate-900 dark:text-dark-text">{siteConfig.tagline}</h1>
            <p className="mt-5 text-lg md:text-xl text-slate-600 dark:text-dark-muted max-w-2xl leading-relaxed">
              We research every AI tool so you don't waste money. Reviews, side-by-side comparisons, and step-by-step tutorials, with prices checked against the vendor's page.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link href="/best" className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-lg transition">Best AI tools {new Date().getFullYear()}</Link>
              <Link href="/news" className="border border-slate-300 dark:border-dark-border hover:border-slate-900 dark:hover:border-dark-text text-slate-900 dark:text-dark-text font-semibold px-6 py-3 rounded-lg transition">Latest AI news</Link>
            </div>
          </div>
          <aside aria-label="Latest AI news" className="hero-in hero-in-2 lg:col-span-4 lg:border-l lg:border-slate-200 dark:lg:border-dark-border lg:pl-8">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-base font-heading font-bold text-slate-900 dark:text-dark-text">Latest AI news</h2>
              <Link href="/news" className="text-sm text-brand-600 dark:text-brand-400 font-medium hover:underline">All news</Link>
            </div>
            <ul className="divide-y divide-slate-200 dark:divide-dark-border">
              {heroNews.map((n) => (
                <li key={n.slug} className="py-3">
                  <Link href={`/news/${n.slug}`} className="block group">
                    <span className="block text-[0.95rem] leading-snug font-medium text-slate-900 dark:text-dark-text group-hover:text-brand-600 dark:group-hover:text-brand-400">{n.title}</span>
                    <time dateTime={n.date} className="text-xs text-slate-500 dark:text-dark-muted">{new Date(n.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</time>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>
      <section aria-labelledby="home-picks" className="border-b border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-baseline justify-between mb-5 flex-wrap gap-2">
            <h2 id="home-picks" className="text-2xl font-heading font-bold tracking-tight">Which AI tool fits your job?</h2>
            <Link href="/best" className="text-sm font-semibold text-brand-600 hover:underline">Full list with prices, checked {BEST_UPDATED_LABEL}</Link>
          </div>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BEST_PICKS.slice(0, 4).map((t) => (
              <li key={t.pick} className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-bg p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-dark-muted">{t.need}</p>
                <p className="font-heading font-bold text-lg mt-1">{t.pick}</p>
                <p className="text-sm text-slate-600 dark:text-dark-muted mt-2">{t.price}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* TOP CATEGORIES */}
      <section data-reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
          <h2 className="text-2xl md:text-3xl font-heading font-bold tracking-tight mb-6">{featured.category === 'AI News' ? 'Latest News' : 'Featured Review'}</h2>
          <div className="grid lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 group bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-dark-border overflow-hidden hover:border-slate-400 hover:shadow-md transition">
              {featured.cover && <Link href={`/${featured.category === 'AI News' ? 'news' : 'posts'}/${featured.slug}`} className="block aspect-video relative overflow-hidden"><Image src={featured.cover} alt={featured.title} fill className="object-cover group-hover:scale-[1.02] transition duration-500" sizes="(max-width: 1024px) 100vw, 66vw" priority /></Link>}
              <div className="p-6">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                  {featured.category && <Badge>{featured.category}</Badge>}
                  <time>{new Date(featured.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</time>
                </div>
                <h3 className="text-2xl md:text-4xl font-heading font-bold tracking-tight leading-tight mb-3"><Link href={`/${featured.category === 'AI News' ? 'news' : 'posts'}/${featured.slug}`} className="hover:text-brand-600 dark:hover:text-brand-400 transition">{featured.title}</Link></h3>
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

      {/* CATEGORY MIX: news, comparisons, tutorials — keeps the homepage
          from being a wall of near-identical template posts */}
      {newsRow.length > 0 && (
        <section data-reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-heading font-bold tracking-tight">More AI News</h2>
            <Link href="/news" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline text-sm">All news →</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {newsRow.map((p, i) => <PostCard key={p.slug} post={p} index={i} />)}
          </div>
        </section>
      )}

      {cmpRow.length > 0 && (
        <section data-reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-heading font-bold tracking-tight">Side-by-Side Comparisons</h2>
            <Link href="/comparisons" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline text-sm">All comparisons →</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cmpRow.map((p, i) => <PostCard key={p.slug} post={p} index={i} />)}
          </div>
        </section>
      )}

      {tutRow.length > 0 && (
        <section data-reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-heading font-bold tracking-tight">Tutorials & Guides</h2>
            <Link href="/tutorials" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline text-sm">All tutorials →</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tutRow.map((p, i) => <PostCard key={p.slug} post={p} index={i} />)}
          </div>
        </section>
      )}

      <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP} />

      {/* LATEST GRID */}
      <section data-reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl md:text-3xl font-heading font-bold tracking-tight mb-6">Latest Reviews & Tutorials</h2>
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
            <button type="submit" className="bg-amber-400 hover:bg-amber-500 text-amber-700 font-bold px-6 py-3 rounded-lg transition whitespace-nowrap active:scale-[0.97]">Subscribe Free</button>
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
                <Plus className="w-5 h-5 text-brand-600 dark:text-brand-400 group-open:rotate-45 transition shrink-0 ml-4" aria-hidden="true" />
              </summary>
              <p className="mt-3 text-slate-700 dark:text-dark-text leading-relaxed font-body">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

import Link from 'next/link';
import { getAllPosts, getAllCategories } from '../lib/posts';
import { siteConfig } from '../lib/config';
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd, organizationJsonLd } from '../lib/schema';
import PostCard from '../components/PostCard';
import AdSlot from '../components/AdSlot';

export const dynamic = 'force-static';

export default function HomePage() {
  const posts = getAllPosts();
  const featured = posts[0];
  const secondary = posts.slice(1, 4);
  const grid = posts.slice(4, 13);
  const categories = getAllCategories().slice(0, 8);

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
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <span className="inline-block bg-amber-400 text-slate-900 text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">Updated for 2026</span>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 tracking-tight">{siteConfig.tagline}</h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-8">
            We test every AI tool so you don't waste money. Independent reviews, side-by-side comparisons, and step-by-step tutorials.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/best" className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold px-6 py-3 rounded-lg transition">Best AI Tools 2026</Link>
            <Link href="/reviews" className="bg-white/10 hover:bg-white/20 backdrop-blur text-white font-semibold px-6 py-3 rounded-lg transition">All Reviews</Link>
          </div>
        </div>
      </section>

      {/* TOP CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {categories.map((c) => (
            <Link key={c.name} href={`/category/${c.name.toLowerCase().replace(/\s+/g, '-')}`} className="whitespace-nowrap bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-700 px-4 py-2 rounded-full text-sm font-medium transition">
              {c.name} <span className="text-slate-400">({c.count})</span>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED + SECONDARY */}
      {featured && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <h2 className="text-2xl font-bold mb-6">🔥 Featured Review</h2>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition">
              {featured.cover && <Link href={`/posts/${featured.slug}`}><img src={featured.cover} alt={featured.title} loading="lazy" className="w-full aspect-video object-cover group-hover:opacity-95 transition" /></Link>}
              <div className="p-6">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                  {featured.category && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold uppercase">{featured.category}</span>}
                  <span>·</span>
                  <time>{new Date(featured.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</time>
                </div>
                <h3 className="text-3xl font-bold mb-3"><Link href={`/posts/${featured.slug}`} className="hover:text-blue-600 transition">{featured.title}</Link></h3>
                <p className="text-slate-600 mb-4">{featured.excerpt}</p>
                <Link href={`/posts/${featured.slug}`} className="text-blue-600 font-semibold hover:underline">Read the full review →</Link>
              </div>
            </div>
            <div className="space-y-4">
              {secondary.map((p) => <PostCard key={p.slug} post={p} />)}
            </div>
          </div>
        </section>
      )}

      <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP} />

      {/* LATEST GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h2 className="text-2xl font-bold mb-6">📚 Latest Reviews & Tutorials</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {grid.map((p) => <PostCard key={p.slug} post={p} />)}
        </div>
        <div className="text-center mt-10">
          <Link href="/reviews" className="inline-block bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-3 rounded-lg transition">View all articles →</Link>
        </div>
      </section>

      <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_MID} />

      {/* FAQ for AI engines (GEO) + humans */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-bold mb-8">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {homeFaqs.map((f, i) => (
            <details key={i} className="bg-white border border-slate-200 rounded-lg p-5 group">
              <summary className="font-semibold text-lg cursor-pointer flex justify-between items-center">
                {f.question}
                <span className="text-blue-600 group-open:rotate-45 transition text-2xl leading-none">+</span>
              </summary>
              <p className="mt-3 text-slate-700 leading-relaxed">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

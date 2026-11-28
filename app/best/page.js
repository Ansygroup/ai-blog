import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getAllPosts } from '../../lib/posts';
import PostCard from '../../components/PostCard';
import { siteConfig } from '../../lib/config';
import { breadcrumbJsonLd } from '../../lib/schema';
import AdSlot from '../../components/AdSlot';
import PaginationNav from '../../components/PaginationNav';
import { BEST_PICKS, BEST_FAQS, BEST_UPDATED, BEST_UPDATED_LABEL } from '../../lib/bestGuide';
import { faqJsonLd, listJsonLd } from '../../lib/schema';
import { hreflangAlternates } from '../../lib/i18n';

const POSTS_PER_PAGE = 24;

export const metadata = {
  title: 'Best AI Tools 2026: Top Picks by Job and Price',
  description: 'Best AI tools for chat, research, coding and voice, with each price read from the vendor pricing page on 27 November 2026. Free tiers flagged.',
  alternates: { canonical: `${siteConfig.url}/best`, languages: hreflangAlternates('/best') },
  openGraph: {
    title: 'Best AI Tools 2026: Top Picks by Job, With Prices Checked 27 Nov 2026',
    description: 'Top AI tools by job with vendor-checked prices and free tiers.',
    url: `${siteConfig.url}/best`,
    siteName: siteConfig.name,
    type: 'website',
  },
};

export default function BestPage() {
  const allPosts = getAllPosts().filter((p) => p.category === 'Best Of');
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  const posts = allPosts.slice(0, POSTS_PER_PAGE);
  return (
    <>
      <script id="ld-best-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: siteConfig.url },
        { name: `Best AI Tools ${new Date().getFullYear()}`, url: `${siteConfig.url}/best` },
      ])) }} />
      <script id="ld-best-collection" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `Best AI Tools ${new Date().getFullYear()}`,
        description: 'Curated rankings of the best AI tools in every category.',
        url: `${siteConfig.url}/best`,
      }) }} />
      <script id="ld-best-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(BEST_FAQS)) }} />
      <script id="ld-best-list" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listJsonLd(BEST_PICKS.map((t) => ({ name: t.pick, url: t.url })))) }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-sm text-slate-500 dark:text-dark-muted mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
            <li><ChevronRight className="w-3.5 h-3.5 text-slate-300" aria-hidden="true" /></li>
            <li className="text-slate-700 dark:text-dark-text">Best AI Tools {new Date().getFullYear()}</li>
          </ol>
        </nav>
        <header className="mb-10">
          <p className="text-sm text-slate-500 dark:text-dark-muted uppercase tracking-wider mb-2">Rankings</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">Best AI Tools 2026: Top Picks by Job</h1>
          <p className="text-lg text-slate-600 dark:text-dark-muted max-w-3xl">Quick answer: start with the free tier of ChatGPT, Claude or Gemini for general work, Perplexity for cited research, Cursor or GitHub Copilot for code, and ElevenLabs for voice. Every price below was read from the vendor's own page.</p>
          <p className="text-sm text-slate-500 dark:text-dark-muted mt-3">By AI Pulse Editorial. Last updated <time dateTime={BEST_UPDATED}>{BEST_UPDATED_LABEL}</time>. We have not run hands-on tests for this page; picks follow each vendor's published plan details.</p>
        </header>
        <section aria-labelledby="picks" className="mb-12">
          <h2 id="picks" className="text-2xl font-bold mb-4">Which AI tool should you pick for each job?</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-dark-border">
            <table className="w-full min-w-[720px] text-sm text-left">
              <thead className="bg-slate-50 dark:bg-dark-card"><tr><th className="p-3">Job</th><th className="p-3">Pick</th><th className="p-3">Why</th><th className="p-3">Price on vendor page (27 Nov 2026)</th></tr></thead>
              <tbody>
                {BEST_PICKS.map((t) => (
                  <tr key={t.pick} className="border-t border-slate-200 dark:border-dark-border align-top">
                    <td className="p-3 font-medium">{t.need}</td>
                    <td className="p-3"><a href={t.url} rel="nofollow noopener" className="text-blue-600 hover:underline">{t.pick}</a></td>
                    <td className="p-3">{t.why}</td>
                    <td className="p-3">{t.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-slate-500 dark:text-dark-muted mt-3">Prices change often. Tools are added only after we read their pricing page. Where a page showed no readable price we say so.</p>
        </section>
        <section aria-labelledby="how" className="mb-12 max-w-3xl">
          <h2 id="how" className="text-2xl font-bold mb-3">How should you choose an AI tool?</h2>
          <ol className="list-decimal pl-5 space-y-2 text-slate-700 dark:text-dark-text">
            <li>Name the job first: chat, research, code or voice. The right tool differs by job.</li>
            <li>Start on the free tier of two tools and run the same real task in both.</li>
            <li>Check the limits. Free and low plans cap usage, and the caps are on each vendor's page.</li>
            <li>Pay monthly at first. Annual prices are lower per month (Claude Pro is $17 billed annually against $20 monthly) but lock you in.</li>
          </ol>
        </section>
        <section aria-labelledby="faq" className="mb-12 max-w-3xl">
          <h2 id="faq" className="text-2xl font-bold mb-3">Best AI tools: common questions</h2>
          <div className="space-y-5">
            {BEST_FAQS.map((f) => (
              <div key={f.question}><h3 className="font-semibold mb-1">{f.question}</h3><p className="text-slate-700 dark:text-dark-text">{f.answer}</p></div>
            ))}
          </div>
        </section>
        <h2 className="text-2xl font-bold mb-4">More Best Of guides from our archive</h2>
        <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((p, i) => <PostCard key={p.slug} post={p} index={i} />)}
        </div>
        <PaginationNav currentPage={1} totalPages={totalPages} basePath="/best" />
      </div>
    </>
  );
}

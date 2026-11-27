import Link from 'next/link';
import { notFound } from 'next/navigation';
import { siteConfig } from '../../../lib/config';
import { LANGS, getDict, hreflangAlternates } from '../../../lib/i18n';
import { BEST_PICKS, BEST_UPDATED } from '../../../lib/bestGuide';
import { faqJsonLd, breadcrumbJsonLd } from '../../../lib/schema';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export function generateMetadata({ params }) {
  const d = getDict(params.lang);
  if (!d) return {};
  const url = `${siteConfig.url}/${params.lang}/best`;
  return {
    title: d.best.title,
    description: d.best.description,
    alternates: { canonical: url, languages: hreflangAlternates('/best') },
    openGraph: { title: d.best.title, description: d.best.description, url, siteName: siteConfig.name, type: 'website', locale: params.lang },
  };
}

export default function LocalizedBest({ params }) {
  const d = getDict(params.lang);
  if (!d) notFound();
  const b = d.best;
  const faqs = b.faqs.map((f) => ({ question: f.q, answer: f.a }));
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqs)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: siteConfig.name, url: `${siteConfig.url}/${params.lang}` },
        { name: b.crumb, url: `${siteConfig.url}/${params.lang}/best` },
      ])) }} />
      <div lang={params.lang} dir={d.dir} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">{b.h1}</h1>
        <p className="text-lg text-slate-600 dark:text-dark-muted max-w-3xl">{b.quick}</p>
        <p className="text-sm text-slate-500 dark:text-dark-muted mt-3"><time dateTime={BEST_UPDATED}>{b.byline}</time></p>
        <section className="mt-10" aria-labelledby="picks">
          <h2 id="picks" className="text-2xl font-bold mb-4">{b.picksH2}</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-dark-border">
            <table className="w-full min-w-[720px] text-sm text-start">
              <thead className="bg-slate-50 dark:bg-dark-card"><tr>{b.cols.map((c) => <th key={c} className="p-3 text-start">{c}</th>)}</tr></thead>
              <tbody>
                {BEST_PICKS.map((t, i) => (
                  <tr key={t.pick} className="border-t border-slate-200 dark:border-dark-border align-top">
                    <td className="p-3 font-medium">{b.picks[i].need}</td>
                    <td className="p-3" dir="ltr"><a href={t.url} rel="nofollow noopener" className="text-blue-600 hover:underline">{t.pick}</a></td>
                    <td className="p-3">{b.picks[i].why}</td>
                    <td className="p-3">{b.picks[i].price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-slate-500 dark:text-dark-muted mt-3">{b.pricesNote}</p>
        </section>
        <section className="mt-10 max-w-3xl" aria-labelledby="how">
          <h2 id="how" className="text-2xl font-bold mb-3">{b.howH2}</h2>
          <ol className="list-decimal ps-5 space-y-2">{b.how.map((x) => <li key={x}>{x}</li>)}</ol>
        </section>
        <section className="mt-10 max-w-3xl" aria-labelledby="faq">
          <h2 id="faq" className="text-2xl font-bold mb-3">{b.faqH2}</h2>
          <div className="space-y-5">{b.faqs.map((f) => <div key={f.q}><h3 className="font-semibold mb-1">{f.q}</h3><p>{f.a}</p></div>)}</div>
        </section>
        <p className="mt-12 text-sm text-slate-500 dark:text-dark-muted">{d.ui.disclosure} <Link href="/best" className="underline" lang="en" dir="ltr">{d.ui.english}</Link></p>
      </div>
    </>
  );
}

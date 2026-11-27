import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllPosts } from '../../lib/posts';
import { siteConfig } from '../../lib/config';
import { LANGS, getDict, hreflangAlternates } from '../../lib/i18n';
import { BEST_PICKS } from '../../lib/bestGuide';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export function generateMetadata({ params }) {
  const d = getDict(params.lang);
  if (!d) return {};
  return {
    title: d.home.title,
    description: d.home.description,
    alternates: { canonical: `${siteConfig.url}/${params.lang}`, languages: hreflangAlternates('/') },
    openGraph: { title: d.home.title, description: d.home.description, url: `${siteConfig.url}/${params.lang}`, siteName: siteConfig.name, type: 'website', locale: params.lang },
  };
}

export default function LocalizedHome({ params }) {
  const d = getDict(params.lang);
  if (!d) notFound();
  const h = d.home;
  const news = getAllPosts().filter((p) => p.primarySourced).slice(0, 5);
  return (
    <div lang={params.lang} dir={d.dir} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl md:text-5xl font-heading font-bold tracking-tight leading-tight">{h.h1}</h1>
      <p className="mt-5 text-lg text-slate-600 dark:text-dark-muted max-w-3xl leading-relaxed">{h.intro}</p>
      <div className="flex flex-wrap gap-3 mt-8">
        <Link href={`/${params.lang}/best`} className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-lg transition">{h.ctaBest}</Link>
        <Link href="/news" className="border border-slate-300 dark:border-dark-border font-semibold px-6 py-3 rounded-lg">{h.ctaNews}</Link>
      </div>
      <section className="mt-12" aria-labelledby="picks">
        <h2 id="picks" className="text-2xl font-heading font-bold mb-2">{h.picksH2}</h2>
        <Link href={`/${params.lang}/best`} className="text-sm font-semibold text-brand-600 hover:underline">{h.picksLink}</Link>
        <ul className="grid sm:grid-cols-2 gap-4 mt-5">
          {BEST_PICKS.slice(0, 4).map((t, i) => (
            <li key={t.pick} className="rounded-xl border border-slate-200 dark:border-dark-border p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-dark-muted">{d.best.picks[i].need}</p>
              <p className="font-heading font-bold text-lg mt-1" dir="ltr">{t.pick}</p>
              <p className="text-sm text-slate-600 dark:text-dark-muted mt-2">{d.best.picks[i].price}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-12" aria-labelledby="latest">
        <h2 id="latest" className="text-2xl font-heading font-bold mb-4">{h.latestH2}</h2>
        <ul className="space-y-3">
          {news.map((p) => (
            <li key={p.slug}><Link href={`/news/${p.slug}`} lang="en" dir="ltr" className="font-semibold hover:underline">{p.title}</Link></li>
          ))}
        </ul>
      </section>
      <p className="mt-12 text-sm text-slate-500 dark:text-dark-muted">{d.ui.disclosure} <Link href="/" className="underline" lang="en" dir="ltr">{d.ui.english}</Link></p>
    </div>
  );
}

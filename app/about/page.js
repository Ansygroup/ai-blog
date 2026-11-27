import Link from 'next/link';
import { siteConfig } from '../../lib/config';
import { breadcrumbJsonLd } from '../../lib/schema';
import PageHeader from '../../components/PageHeader';

export const metadata = {
  title: `About ${siteConfig.name}`,
  description: 'What AI Pulse Daily is, how we choose what to cover, how we handle prices and sources, and how we are funded.',
  alternates: { canonical: `${siteConfig.url}/about` },
  openGraph: { title: `About ${siteConfig.name}`, description: 'What AI Pulse Daily is and how it works.', url: `${siteConfig.url}/about`, siteName: siteConfig.name, type: 'website', images: ['https://ansygroup.github.io/blog-images/mind-b1-01-A.jpg'] },
};

export default function AboutPage() {
  return (
    <>
      <script id="ld-about-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: siteConfig.url },
        { name: 'About', url: `${siteConfig.url}/about` },
      ])) }} />
      <script id="ld-about" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'AboutPage', name: `About ${siteConfig.name}`,
        url: `${siteConfig.url}/about`,
        mainEntity: { '@type': 'Organization', name: 'AI Pulse Editorial', url: siteConfig.url },
      }) }} />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <PageHeader image="mind-b1-01-A.jpg" title={`About ${siteConfig.name}`} lead="A plain-language guide to AI tools and AI news, with prices and facts taken from the vendors' own pages." />
        <article className="prose-blog">
          <h2>What this site is</h2>
          <p>{siteConfig.name} is an independent publication written and edited under the name AI Pulse Editorial. It covers AI tools, pricing and product news for people who use AI at work and want a short, checked answer instead of a long sales page.</p>
          <h2>How we choose what to cover</h2>
          <p>News posts come from a primary source: the vendor's own announcement, blog or documentation page. We link that source and label vendor claims as vendor claims. Buying guides such as <Link href="/best">Best AI tools</Link> compare tools by the job they do, and list the price we read on the vendor's page along with the date we read it.</p>
          <h2>Prices and corrections</h2>
          <p>Prices change often. When we could not read a price, the page says so instead of guessing. If you spot something out of date or wrong, use the <Link href="/contact">contact page</Link>. We fix errors and note material corrections on the page.</p>
          <h2>How the site is funded</h2>
          <p>The site may show ads and may include affiliate links. Both are labelled, and neither changes what we write. Read the <Link href="/disclosure">affiliate disclosure</Link> and the <Link href="/editorial-policy">editorial policy</Link> for details.</p>
          <h2>Our limits</h2>
          <p>We read vendor pages and documentation. We do not claim lab testing or personal experience we do not have. Treat our pages as a starting point and check the vendor's current terms before you buy. See the <Link href="/disclaimer">disclaimer</Link>.</p>
        </article>
      </div>
    </>
  );
}

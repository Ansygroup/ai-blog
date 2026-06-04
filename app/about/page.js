import Link from 'next/link';
import { siteConfig } from '../../lib/config';
import { breadcrumbJsonLd } from '../../lib/schema';

export const metadata = {
  title: `About ${siteConfig.name}`,
  description: `Who we are, how we test AI tools on 10 real tasks, and our strict editorial standards. Independent since 2024.`,
  alternates: { canonical: `${siteConfig.url}/about` },
  openGraph: {
    title: `About ${siteConfig.name} — Independent AI Tool Reviews`,
    description: `Who we are, how we test AI tools, and our strict editorial standards.`,
    url: `${siteConfig.url}/about`,
    siteName: siteConfig.name,
    type: 'profile',
  },
};

export default function AboutPage() {
  const team = [
    { name: 'Alex Moreno', role: 'Lead Reviewer', focus: 'AI writing & image tools' },
    { name: 'Sarah Chen', role: 'Technical Editor', focus: 'Code assistants & developer tools' },
    { name: 'Marcus Webb', role: 'Video & Audio Lead', focus: 'AI video, music & voice tools' },
    { name: 'Priya Kapoor', role: 'SEO Strategist', focus: 'Content optimization & GEO' },
  ];

  return (
    <>
      <script id="ld-about-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: siteConfig.url },
        { name: 'About', url: `${siteConfig.url}/about` },
      ])) }} />
      <script id="ld-about" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        name: `About ${siteConfig.name}`,
        description: `Independent AI tool reviews and comparisons.`,
        url: `${siteConfig.url}/about`,
        mainEntity: { '@type': 'Organization', name: siteConfig.name, url: siteConfig.url },
      }) }} />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <nav className="text-sm text-slate-500 dark:text-dark-muted mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
            <li>/</li>
            <li className="text-slate-700 dark:text-dark-text">About</li>
          </ol>
        </nav>
        <article className="prose-blog">
          <h1>About {siteConfig.name}</h1>
          <p className="lead">{siteConfig.tagline}</p>

          <h2>Who we are</h2>
          <p>{siteConfig.name} is an independent publication run by a small team of AI practitioners, writers, and SEO specialists. We have been covering AI tools since 2024, and our mission is simple: save you time and money by telling you which tools actually deliver.</p>

          <h2>Our team</h2>
          <div className="grid sm:grid-cols-2 gap-4 not-prose">
            {team.map((m) => (
              <div key={m.name} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm mb-2">{m.name.split(' ').map(n => n[0]).join('')}</div>
                <div className="font-semibold text-slate-900 dark:text-dark-text">{m.name}</div>
                <div className="text-sm text-slate-500 dark:text-dark-muted">{m.role}</div>
                <div className="text-xs text-slate-400 mt-1">{m.focus}</div>
              </div>
            ))}
          </div>

          <h2>How we test</h2>
          <p>Every tool review follows the same <strong>10-task rubric</strong>, with no special treatment for companies that pay (we do not accept payment for reviews):</p>
          <ol>
            <li>Sign-up and onboarding experience</li>
            <li>Quality of output on 3 real-world writing tasks</li>
            <li>Image / code / data generation (when applicable)</li>
            <li>Speed / latency benchmarks</li>
            <li>Pricing transparency and hidden costs</li>
            <li>Customer support responsiveness (we send the same 5 questions)</li>
            <li>Data privacy and training-data policy review</li>
            <li>Integration ecosystem (Zapier, API, SDK)</li>
            <li>Long-term stability (we re-test every 90 days)</li>
            <li>Refund and cancellation ease</li>
          </ol>
          <p>We pay for every tool ourselves using personal or business accounts — no trial extensions, no reviewer discounts. This guarantees our experience matches what you will get as a paying customer.</p>

          <h2>Editorial standards</h2>
          <ul>
            <li>We never accept payment to publish a positive review.</li>
            <li>Affiliate links are clearly marked on every page.</li>
            <li>Every "best of" list is re-tested quarterly and re-published with a new date.</li>
            <li>When we make a mistake, we publish a visible correction at the top of the article.</li>
            <li>Sponsored content is labelled with a prominent banner — currently we run zero sponsored content.</li>
          </ul>

          <h2>Why trust us?</h2>
          <p>We have no VC funding, no board of directors, and no exit strategy. Our only incentive is to produce content accurate enough that you keep coming back. If a tool is overhyped, we say so. If a cheaper alternative outperforms an expensive one, we recommend the cheaper option.</p>

          <h2>Disclosure</h2>
          <p>This site contains affiliate links. When you click certain links and make a purchase, we may earn a commission at no extra cost to you. This funds our testing and keeps the content free. We only recommend products we have personally paid for and used.</p>

          <h2>Contact</h2>
          <p>Questions, corrections, or review requests? Email <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>. We typically respond within 24 hours.</p>
        </article>
      </div>
    </>
  );
}

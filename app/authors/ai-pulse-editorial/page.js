import Link from 'next/link';
import { siteConfig } from '../../../lib/config';
import { getAllPosts } from '../../../lib/posts';
import { breadcrumbJsonLd } from '../../../lib/schema';
import PageHeader from '../../../components/PageHeader';

export const metadata = {
  title: 'AI Pulse Editorial: about the byline',
  description: 'AI Pulse Editorial is the byline for every article on AI Pulse Daily. How articles are researched, sourced and corrected.',
  alternates: { canonical: `${siteConfig.url}/authors/ai-pulse-editorial` },
  openGraph: { title: 'AI Pulse Editorial', description: 'The byline behind AI Pulse Daily.', url: `${siteConfig.url}/authors/ai-pulse-editorial`, siteName: siteConfig.name, type: 'profile', images: ['https://ansygroup.github.io/blog-images/mind-b2-11-A.jpg'] },
};

export default function AuthorPage() {
  const latest = getAllPosts().filter((p) => p.primarySourced).slice(0, 8);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: siteConfig.url },
        { name: 'AI Pulse Editorial', url: `${siteConfig.url}/authors/ai-pulse-editorial` },
      ])) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'ProfilePage',
        mainEntity: { '@type': 'Organization', name: 'AI Pulse Editorial', url: siteConfig.url, parentOrganization: { '@type': 'Organization', name: siteConfig.name } },
      }) }} />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <PageHeader image="mind-b2-11-A.jpg" title="AI Pulse Editorial" lead="The byline on every article on this site." />
        <div className="prose-blog">
          <p>AI Pulse Editorial is a publication byline, not a single person. Articles are researched from primary sources such as vendor announcements, documentation and pricing pages, with software assisting research and drafting. We say what we checked and when, and we label vendor claims as vendor claims.</p>
          <p>We do not claim lab testing or personal experience we do not have. Read the <Link href="/editorial-policy">editorial policy</Link>, <Link href="/how-we-test">how we research</Link> and the <Link href="/disclaimer">disclaimer</Link>. Report an error on the <Link href="/contact">contact page</Link>.</p>
          <h2>Recent news</h2>
          <ul>{latest.map((p) => <li key={p.slug}><Link href={`/news/${p.slug}`}>{p.title}</Link></li>)}</ul>
        </div>
      </div>
    </>
  );
}

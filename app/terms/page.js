import { siteConfig } from '../../lib/config';
import PageHeader from '../../components/PageHeader';

export const metadata = {
  title: 'Terms of Service',
  description: 'Terms for using AI Pulse Daily: content use, links, accuracy and liability.',
  alternates: { canonical: siteConfig.url + '/terms' },
  openGraph: { title: 'Terms of Service', description: 'Terms for using AI Pulse Daily.', url: siteConfig.url + '/terms', siteName: siteConfig.name, type: 'website', images: ['https://ansygroup.github.io/blog-images/mind-b1-02-B.jpg'] },
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <PageHeader image="mind-b1-02-B.jpg" title="Terms of Service" lead="By using this site you agree to these terms." />
      <div className="prose-blog">
        <h2>Content</h2>
        <p>The text, layout and graphics on this site belong to AI Pulse Editorial unless marked otherwise. You may quote short excerpts (up to 150 words) with a link back to the original page. Do not copy whole articles.</p>
        <h2>Information only</h2>
        <p>Pages here are general information. They are not legal, financial, medical or professional advice. Check a vendor's current price and terms before you buy. See the <a href="/disclaimer">disclaimer</a>.</p>
        <h2>Third-party links</h2>
        <p>We link to vendor sites we do not control. We are not responsible for their content, prices or policies. Some links are affiliate links; see the <a href="/disclosure">disclosure</a>.</p>
        <h2>Acceptable use</h2>
        <p>Do not scrape the site in a way that harms its performance, try to break into it, or use it to send spam.</p>
        <h2>No warranty and liability</h2>
        <p>We work to keep pages accurate, but the site is provided "as is" without warranties. To the extent the law allows, we are not liable for losses from using it.</p>
        <h2>Changes</h2>
        <p>We may update these terms. Continued use means you accept the current version.</p>
      </div>
    </div>
  );
}

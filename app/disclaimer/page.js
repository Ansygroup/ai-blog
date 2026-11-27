import { siteConfig } from '../../lib/config';
import PageHeader from '../../components/PageHeader';

export const metadata = {
  title: 'Disclaimer',
  description: 'AI Pulse Daily gives general information only. Read what that means for prices, tool details and advice.',
  alternates: { canonical: siteConfig.url + '/disclaimer' },
  openGraph: { title: 'Disclaimer', description: 'General information only, not advice.', url: siteConfig.url + '/disclaimer', siteName: siteConfig.name, type: 'website', images: ['https://ansygroup.github.io/blog-images/mind-b2-11-A.jpg'] },
};

export default function DisclaimerPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <PageHeader image="mind-b2-11-A.jpg" title="Disclaimer" lead="General information, not advice." />
      <div className="prose-blog">
        <h2>Information only</h2>
        <p>Everything on {siteConfig.name} is general information. It is not legal, financial, medical, tax or other professional advice.</p>
        <h2>Prices and features change</h2>
        <p>AI tools change prices, limits and features without notice. Where we show a price we name the vendor page and the date we read it, but it may be out of date by the time you read it. Confirm on the vendor's site before you buy.</p>
        <h2>Vendor claims</h2>
        <p>Performance numbers and feature claims that come from a vendor are reported as that vendor's claims. We have not independently verified them unless a page says so.</p>
        <h2>AI-assisted content</h2>
        <p>We use software to help research and draft pages. Pages are published under AI Pulse Editorial, and facts are checked against the cited source. Errors can still happen. Tell us on the <a href="/contact">contact page</a> and we will fix them.</p>
        <h2>Affiliate links and ads</h2>
        <p>The site may earn money from ads or affiliate links. This does not change the price you pay. See the <a href="/disclosure">disclosure</a>.</p>
        <h2>Use at your own risk</h2>
        <p>You are responsible for decisions you make based on this site.</p>
      </div>
    </div>
  );
}

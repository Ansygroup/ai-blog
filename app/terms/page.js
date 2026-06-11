import { siteConfig } from '../../lib/config';

export const metadata = {
  title: 'Terms of Service — AI Pulse Daily',
  description: 'Terms of service for AI Pulse Daily. Read our terms, conditions, and policies.',
  alternates: { canonical: siteConfig.url + '/terms' },
  openGraph: {
    title: 'Terms of Service — AI Pulse Daily',
    description: 'Terms of service for AI Pulse Daily.',
    url: siteConfig.url + '/terms',
    siteName: siteConfig.name,
    type: 'website',
  },
};
export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 prose-blog">
      <h1>Terms of Service</h1>
      <p className="lead">By using this site you agree to the following terms.</p>
      <h2>Content</h2>
      <p>All original text, graphics, and code on this site are our property unless otherwise noted. You may quote brief excerpts (≤150 words) with proper attribution and a link back to the original article.</p>
      <h2>No professional advice</h2>
      <p>Our reviews and tutorials are informational only. We do not provide legal, financial, or medical advice. AI tool recommendations should be validated against your own use case before purchase.</p>
      <h2>Affiliate links</h2>
      <p>Some links are affiliate links. See our disclosure page for details.</p>
      <h2>Limitation of liability</h2>
      <p>We strive for accuracy but make no warranties about completeness or fitness for any particular purpose. Your use of this site is at your own risk.</p>
    </div>
  );
}

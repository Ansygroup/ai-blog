import { siteConfig } from '../../lib/config';
export const metadata = {
  title: 'Contact',
  description: `Get in touch with ${siteConfig.name}. Editorial inquiries, press partnerships, and affiliate opportunities. Response within 1-3 business days.`,
  alternates: { canonical: `${siteConfig.url}/contact` },
  openGraph: {
    title: 'Contact Us — AI Pulse Daily',
    description: 'Get in touch with the AI Pulse Daily team.',
    url: siteConfig.url + '/contact',
    siteName: siteConfig.name,
    type: 'website',
  },
};
export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 prose-blog">
      <h1>Contact</h1>
      <p>Editorial inquiries: <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a></p>
      <p>Press &amp; partnerships: <a href={`mailto:press@${siteConfig.url.replace(/^https?:\/\//, '')}`}>press@{siteConfig.url.replace(/^https?:\/\//, '')}</a></p>
      <p>Typical response time: 1-3 business days.</p>
    </div>
  );
}

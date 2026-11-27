import { siteConfig } from '../../lib/config';
import PageHeader from '../../components/PageHeader';

export const metadata = {
  title: 'Contact',
  description: `Send a correction, question or business inquiry to ${siteConfig.name}.`,
  alternates: { canonical: `${siteConfig.url}/contact` },
  openGraph: { title: `Contact ${siteConfig.name}`, description: 'Send a correction, question or inquiry.', url: `${siteConfig.url}/contact`, siteName: siteConfig.name, type: 'website', images: ['https://ansygroup.github.io/blog-images/mind-b5-41-B.jpg'] },
};

export default function ContactPage() {
  const input = 'w-full rounded-lg border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card px-3 py-2';
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <PageHeader image="mind-b5-41-B.jpg" title="Contact" lead="Found a wrong price, an outdated fact or a broken link? Tell us." />
      <form action={`mailto:${siteConfig.email}`} method="post" encType="text/plain" className="space-y-4">
        <label className="block"><span className="block text-sm font-semibold mb-1">Your email</span><input type="email" name="email" required placeholder="you@example.com" className={input} /></label>
        <label className="block"><span className="block text-sm font-semibold mb-1">Subject</span><input type="text" name="subject" required placeholder="Correction, question or inquiry" className={input} /></label>
        <label className="block"><span className="block text-sm font-semibold mb-1">Message</span><textarea name="message" rows="6" required className={input} /></label>
        <button type="submit" className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-lg transition">Open in my email app</button>
        <p className="text-sm text-slate-500 dark:text-dark-muted">This form opens your email app with the message addressed to our placeholder inbox, <span dir="ltr">{siteConfig.email}</span>. Nothing is stored on this site.</p>
      </form>
    </div>
  );
}

import { siteConfig } from '../../lib/config';
import PageHeader from '../../components/PageHeader';

export const metadata = {
  title: 'Privacy Policy',
  description: 'What data AI Pulse Daily collects, which cookies and ad services it uses, and how to opt out.',
  alternates: { canonical: siteConfig.url + '/privacy' },
  openGraph: { title: 'Privacy Policy', description: 'How AI Pulse Daily handles data and cookies.', url: siteConfig.url + '/privacy', siteName: siteConfig.name, type: 'website', images: ['https://ansygroup.github.io/blog-images/mind-b3-25-B.jpg'] },
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <PageHeader image="mind-b3-25-B.jpg" title="Privacy Policy" lead="Last updated: November 27, 2026" />
      <div className="prose-blog">
        <h2>What we collect</h2>
        <p>We do not ask you to create an account. We do not collect your name, address or payment details. The contact page opens your own email app, so a message you write reaches us only if you send it from there.</p>
        <h2>Analytics</h2>
        <p>We use Cloudflare Web Analytics to count visits and see which pages are read. It does not use cookies to track you across sites.</p>
        <h2>Cookies and advertising</h2>
        <p>The site may show ads from Google AdSense. Google and its partners may use cookies to show and measure ads, including ads based on your earlier visits where the law allows it. You can manage personalized ads at <a href="https://adssettings.google.com">adssettings.google.com</a>. You can also block cookies in your browser; the site still works.</p>
        <p>We store one small item in your browser to remember that you dismissed a banner, such as the language suggestion. It stays on your device.</p>
        <h2>Affiliate links</h2>
        <p>Some links may be affiliate links. If you click one, the vendor may set its own cookies and handle your purchase under its own privacy policy. See the <a href="/disclosure">affiliate disclosure</a>.</p>
        <h2>Your rights</h2>
        <p>If you are in the EU, UK or California, you may ask what data we hold about you, or ask us to correct or delete it. Because we collect almost none, the answer is usually "none", but write to us and we will reply.</p>
        <h2>Children</h2>
        <p>This site is not aimed at children under 13, and we do not knowingly collect their data.</p>
        <h2>Changes</h2>
        <p>We will update the date above when this policy changes.</p>
        <h2>Contact</h2>
        <p>Use the <a href="/contact">contact page</a>.</p>
      </div>
    </div>
  );
}

export const metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 prose-blog">
      <h1>Privacy Policy</h1>
      <p className="lead">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      <h2>Information we collect</h2>
      <p>We collect minimal information: anonymous usage analytics (via Plausible or Google Analytics) and email addresses you voluntarily provide when subscribing to our newsletter. We do not collect names, addresses, or payment information directly — purchases made through affiliate links are processed by the third-party vendor (e.g., Jasper, Surfer SEO).</p>
      <h2>Cookies</h2>
      <p>We use a minimal number of cookies: one for newsletter session, and one for ad personalization if you have consented. You can disable cookies in your browser without affecting site access.</p>
      <h2>Advertising</h2>
      <p>We use Google AdSense and possibly Ezoic to display ads. These vendors use cookies to serve ads based on your prior visits. You can opt out of personalized advertising at <a href="https://www.google.com/settings/ads">google.com/settings/ads</a>.</p>
      <h2>Your rights (GDPR / CCPA)</h2>
      <p>You may request access, correction, or deletion of your data at any time by emailing us. We respond within 30 days.</p>
      <h2>Children's privacy</h2>
      <p>This site is not directed at children under 13. We do not knowingly collect data from children.</p>
      <h2>Contact</h2>
      <p>Email: hello@ai-blog-ten-steel.vercel.app</p>
    </div>
  );
}

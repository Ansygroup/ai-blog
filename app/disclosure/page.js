export const metadata = { title: 'Affiliate Disclosure' };

export default function DisclosurePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 prose-blog">
      <h1>Affiliate Disclosure</h1>
      <p className="lead">Transparency is one of our core editorial values. Here's how we make money and how it affects (and doesn't affect) our content.</p>
      <h2>How we earn revenue</h2>
      <p>This site earns revenue in four ways:</p>
      <ol>
        <li><strong>Affiliate links.</strong> When we recommend a product and you click our link to purchase, the vendor pays us a small commission. This costs you nothing extra.</li>
        <li><strong>Display advertising.</strong> We show ads via Google AdSense / Ezoic on some pages. Advertisers do not see or approve our content.</li>
        <li><strong>Sponsored posts (rare).</strong> Occasionally a vendor pays us to write an in-depth review. Sponsored posts are always labeled with a clear "Sponsored" tag and meet the same editorial standards as our regular content.</li>
        <li><strong>Digital products.</strong> We sell prompt packs and Notion templates related to our content.</li>
      </ol>
      <h2>What we never do</h2>
      <ul>
        <li>We never accept payment in exchange for a positive review.</li>
        <li>We never let affiliate partnerships influence our testing rubric or scoring.</li>
        <li>We never recommend a product we haven't personally used and paid for.</li>
      </ul>
      <h2>Our affiliate partners</h2>
      <p>Current partners include (but are not limited to): Jasper AI, Surfer SEO, NordVPN, Copy.ai, and Amazon. Affiliate programs are subject to change.</p>
      <h2>Questions?</h2>
      <p>Email hello@yourdomain.com with any questions about our affiliate relationships.</p>
    </div>
  );
}

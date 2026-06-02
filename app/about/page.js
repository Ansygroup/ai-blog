import { siteConfig } from '../../lib/config';

export const metadata = { title: 'About', description: `About ${siteConfig.name}: who we are, how we test, and our editorial standards.` };

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 prose-blog">
      <h1>About {siteConfig.name}</h1>
      <p className="lead">{siteConfig.tagline}</p>
      <h2>Who we are</h2>
      <p>{siteConfig.name} is an independent publication run by a small team of AI practitioners, writers, and SEO specialists. We've been covering AI tools since 2024.</p>
      <h2>How we test</h2>
      <p>Every tool review follows the same 10-task rubric:</p>
      <ol>
        <li>Sign-up and onboarding experience</li>
        <li>Quality of output on 3 real-world writing tasks</li>
        <li>Image / code / data generation (when applicable)</li>
        <li>Speed / latency benchmarks</li>
        <li>Pricing transparency and hidden costs</li>
        <li>Customer support responsiveness (we send the same 5 questions)</li>
        <li>Data privacy and training-data policy review</li>
        <li>Integration ecosystem (Zapier, API, etc.)</li>
        <li>Long-term stability (we re-test every 90 days)</li>
        <li>Refund and cancellation ease</li>
      </ol>
      <h2>Editorial standards</h2>
      <ul>
        <li>We never accept payment to publish a positive review.</li>
        <li>Affiliate links are clearly marked on every page.</li>
        <li>Every "best of" list is re-tested quarterly and re-published with a new date.</li>
        <li>When we make a mistake, we publish a visible correction at the top of the article.</li>
      </ul>
      <h2>Disclosure</h2>
      <p>This site contains affiliate links. When you click certain links and make a purchase, we may earn a commission at no extra cost to you. This funds our testing and keeps the content free. We only recommend products we've personally paid for and used.</p>
      <h2>Contact</h2>
      <p>Email us at <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a></p>
    </div>
  );
}

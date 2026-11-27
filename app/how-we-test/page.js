import Link from 'next/link';

export const metadata = {
  title: 'How We Test and Research AI Tools | AI Pulse Daily',
  description: 'The exact research process behind AI Pulse Daily reviews and comparisons: primary sources, live pricing checks, hands-on checks we actually ran, and what we never claim.',
  alternates: { canonical: 'https://aiblogger.us.ci/how-we-test' },
};

export default function HowWeTestPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 prose-blog">
      <h1>How We Test and Research AI Tools</h1>
      <p className="text-slate-500">Last updated: November 27, 2026</p>

      <p>
        This page describes, plainly, how an AI Pulse Daily article gets made. We would rather tell you the real
        process than pretend to be a testing lab we are not.
      </p>

      <h2>What every article goes through</h2>
      <ol>
        <li>
          <strong>Primary sources first.</strong> Product names, features, limits, and prices come from the
          vendor's own documentation and pricing pages, not from other reviews.
        </li>
        <li>
          <strong>Pricing verified on the day.</strong> Every price in an article is checked against the vendor's
          live pricing page on the date the article is published or updated. The article says when.
        </li>
        <li>
          <strong>A person reviews it.</strong> We use AI tools to help research and draft, and a person checks
          the facts, the names, and the numbers before anything is published.
        </li>
        <li>
          <strong>Updates when things change.</strong> When a plan is repriced or a feature is renamed, we update
          the article and change the "last reviewed" date at the top. We do not bump dates without changing
          content.
        </li>
      </ol>

      <h2>What "hands-on" means here</h2>
      <p>
        When an article says we checked something ourselves, it describes a specific action: for example,
        signing up for a free tier to confirm a limit, or generating a sample to compare output quality.
        The article states what we did and when. We do not run benchmark suites or long-term lab testing,
        and we do not claim to.
      </p>

      <h2>What we never do</h2>
      <ul>
        <li>We do not invent test results, benchmarks, user numbers, quotes, or review scores.</li>
        <li>We do not present vendor marketing claims as verified facts without labeling them as claims.</li>
        <li>We do not accept payment for a positive review or a ranking position.</li>
      </ul>

      <h2>Corrections</h2>
      <p>
        If we get something wrong, we fix the article and note the correction. To report an error, use the
        contact details on our <Link href="/contact">contact page</Link>. Our sourcing rules in full are in the{' '}
        <Link href="/editorial-policy">editorial policy</Link>, and how we earn money is on the{' '}
        <Link href="/disclosure">affiliate disclosure</Link> page.
      </p>
    </div>
  );
}

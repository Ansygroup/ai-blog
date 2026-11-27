import Link from 'next/link';

export const metadata = {
  title: 'Editorial Policy | AI Pulse Daily',
  description: 'How AI Pulse Daily researches, writes, and corrects its articles: our sourcing standards, how we use AI tools, and how to request a correction.',
  alternates: { canonical: 'https://aiblogger.us.ci/editorial-policy' },
};

export default function EditorialPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 prose-blog">
      <h1>Editorial Policy</h1>
      <p className="text-slate-500">Last updated: November 27, 2026</p>

      <h2>Who writes AI Pulse Daily</h2>
      <p>
        AI Pulse Daily is published by the AI Pulse Editorial team. We write under a single editorial identity
        rather than invented individual bylines, because that is the honest description of how this site works:
        a small editorial operation, not a newsroom of named reporters.
      </p>

      <h2>How we use AI</h2>
      <p>
        We use AI tools to help research and draft articles, and we say so plainly. Every article is reviewed by
        a person before publication: facts are checked against primary sources, product and company names are
        verified against official documentation, and pricing is checked against the vendor's live pricing page
        on the date shown in the article. If an article got something wrong, that is our error, not the tool's.
      </p>

      <h2>Sourcing standards</h2>
      <ul>
        <li>Product names, features, and prices come from official vendor documentation and pricing pages, checked on the publication date.</li>
        <li>Benchmarks and measurements are quoted only from sources we link to, or from tests we ran ourselves.</li>
        <li>When we run our own check (for example, signing up for a free tier to confirm a limit), the article says exactly what we did.</li>
        <li>We do not invent quotes, test results, user numbers, or review scores. If we did not measure it, we do not present it as measured.</li>
      </ul>

      <h2>Hands-on testing claims</h2>
      <p>
        Some articles describe hands-on use of a tool. Those sections reflect what we actually did, on the date
        stated, and nothing more. Articles that are research roundups based on documentation and verified user
        reports are presented as research, not as lab reviews.
      </p>

      <h2>Updates and corrections</h2>
      <p>
        The date at the top of an article is when it was published. The "last reviewed" date changes only when
        the content itself changes: a repriced plan, a renamed product, a discontinued feature. We do not bump
        dates to make articles look fresh.
      </p>
      <p>
        Spot an error? Email us via the <Link href="/contact">contact page</Link> with the article URL and what
        is wrong. Confirmed factual errors are corrected in the article, and material corrections are noted at
        the bottom of the page.
      </p>

      <h2>How we make money</h2>
      <p>
        The site is funded by display advertising. Some articles link to products with affiliate programs; those
        links never change our rankings or verdicts. See the <Link href="/disclosure">affiliate disclosure</Link> for details.
      </p>
    </div>
  );
}

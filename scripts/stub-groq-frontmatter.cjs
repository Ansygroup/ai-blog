// Preload for verify-frontmatter-gate.sh: stub fetch so generate-post.js's Groq
// provider returns EXACTLY two shapes we need to prove the frontmatter gate:
//
//   MODE=preamble  -> "Here is the article:\n\n---\ntitle: ...\n---\n# H1 ..."
//                     (the real 2026-10-03 failure: prose BEFORE the fence)
//   MODE=frontmatterless -> "# H1\n\nJust prose, no YAML at all."
//                     (the worst case: the old code wrote this to disk)
//
// Everything else (media-gen, etc.) falls through to the real fetch.
const realFetch = globalThis.fetch;
const MODE = process.env.STUB_MODE || 'preamble';

const BODY = [
  '',
  '# Verified Gate Article 2026',
  '',
  '## What it covers',
  '',
  'Body paragraph one for the word count gate to pass comfortably.',
  '',
  '## Comparison',
  '',
  'More body text so the word count check is satisfied for this verification.',
  '',
  '## FAQ',
  '',
  '### Is this real?',
  '',
  'No — this is a fixture produced by stub-groq-frontmatter.cjs.',
  '',
].join('\n');

const FM = [
  'title: "Verified Gate Article 2026"',
  'slug: "verified-gate-article-2026"',
  'excerpt: "A verification fixture post emitted with a prose preamble before the frontmatter."',
  'date: "2020-01-01"',
  'lastUpdated: "2020-01-01"',
  'category: "AI Tools"',
  'tags: ["testing"]',
  'cover: "/images/verified-gate-article-2026.jpg"',
  '',
].join('\n');

const PLAIN = '# Verified Gate Article 2026\n\n' + BODY;

globalThis.fetch = async function (url, opts) {
  const u = String(url);
  if (u.includes('api.groq.com')) {
    let text;
    if (MODE === 'frontmatterless') {
      text = PLAIN;
    } else if (MODE === 'preamble') {
      text = 'Here is the publication-ready article as requested.\n\n---\n' + FM + '---\n' + BODY;
    } else if (MODE === 'unclosed') {
      // The real 2026-10-05 failure (commit 1d28ea9d8): the model opened the
      // fence, then never closed it, so the whole body was swallowed into the
      // YAML. The OLD gate regex matched the `---` inside BODY below and let the
      // broken file through. gray-matter then threw "end of the stream or a
      // document separator is expected".
      text = '---\n' + FM + BODY;
    } else {
      text = '---\n' + FM + '---\n' + BODY;
    }
    return {
      ok: true,
      status: 200,
      text: async () => text,
      json: async () => ({
        choices: [{ message: { role: 'assistant', content: text } }],
      }),
    };
  }
  return realFetch(url, opts);
};

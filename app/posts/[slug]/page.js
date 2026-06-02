import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllPostSlugs, getPostBySlug, getRelatedPosts } from '../../../lib/posts';
import { renderSafeMarkdown } from '../../../lib/markdown';
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd } from '../../../lib/schema';
import { siteConfig } from '../../../lib/config';
import AdSlot from '../../../components/AdSlot';
import PostCard from '../../../components/PostCard';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const post = getPostBySlug(params.slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt || post.description,
    keywords: post.tags,
    alternates: { canonical: `${siteConfig.url}/posts/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt,
      url: `${siteConfig.url}/posts/${post.slug}`,
      publishedTime: post.date,
      modifiedTime: post.lastUpdated || post.date,
      authors: [post.author || siteConfig.author],
      tags: post.tags,
      images: post.cover ? [{ url: post.cover, width: 1200, height: 630 }] : undefined,
    },
    twitter: { card: 'summary_large_image', title: post.title, description: post.excerpt, images: post.cover ? [post.cover] : undefined },
  };
}

export default async function PostPage({ params }) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  // Render markdown -> HTML -> sanitize (XSS-safe). Sanitization happens in lib/markdown.js.
  const contentHtml = await renderSafeMarkdown(post.content);

  const url = `${siteConfig.url}/posts/${post.slug}`;
  const related = getRelatedPosts(post.slug, post.category, 3);
  const faqs = parseFAQs(post.content);

  return (
    <article className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* JSON-LD inline so it's in the initial SSR HTML (crawlers read raw HTML) */}
      <script id="ld-article" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd(post, url)) }} />
      <script id="ld-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: siteConfig.url }, { name: post.category || 'Article', url: `${siteConfig.url}/category/${(post.category || '').toLowerCase().replace(/\s+/g, '-')}` }, { name: post.title, url }
      ])) }} />
      {faqs && <script id="ld-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqs)) }} />}

      <nav className="text-sm text-slate-500 mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2">
          <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
          <li>/</li>
          {post.category && <li><Link href={`/category/${post.category.toLowerCase().replace(/\s+/g, '-')}`} className="hover:text-blue-600 capitalize">{post.category}</Link></li>}
          {post.category && <li>/</li>}
          <li className="text-slate-700 truncate max-w-xs">{post.title}</li>
        </ol>
      </nav>

      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <header className="mb-8">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
              {post.category && <Link href={`/category/${post.category.toLowerCase().replace(/\s+/g, '-')}`} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide hover:bg-blue-200">{post.category}</Link>}
              <span>·</span>
              <time dateTime={post.date}>{new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</time>
              {post.readingTime && <><span>·</span><span>{post.readingTime} min read</span></>}
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">{post.title}</h1>
            {post.excerpt && <p className="text-xl text-slate-600 leading-relaxed">{post.excerpt}</p>}
            <div className="flex items-center gap-3 mt-5 text-sm text-slate-600">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">{post.author?.[0] || 'A'}</div>
              <div>
                <div className="font-semibold text-slate-900">{post.author || siteConfig.author}</div>
                {post.lastUpdated && <div className="text-xs text-slate-500">Updated {new Date(post.lastUpdated).toLocaleDateString()}</div>}
              </div>
            </div>
          </header>

          {post.cover && <img src={post.cover} alt={post.title} className="w-full rounded-xl shadow-md mb-8" />}

          <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP} />

          <div className="prose-blog" dangerouslySetInnerHTML={{ __html: contentHtml }} />

          <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_MID} />

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-10 pt-6 border-t border-slate-200">
              <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((t) => <Link key={t} href={`/tag/${t.toLowerCase().replace(/\s+/g, '-')}`} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-full text-sm transition">#{t}</Link>)}
              </div>
            </div>
          )}

          {/* FAQ section (renders from <details> blocks in markdown if present) */}
          {faqs && faqs.length > 0 && (
            <section className="mt-12 bg-slate-50 border border-slate-200 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
              <div className="space-y-3">
                {faqs.map((f, i) => (
                  <details key={i} className="bg-white border border-slate-200 rounded-lg p-4 group">
                    <summary className="font-semibold cursor-pointer flex justify-between items-center">
                      {f.question}
                      <span className="text-blue-600 group-open:rotate-45 transition text-2xl leading-none">+</span>
                    </summary>
                    <p className="mt-3 text-slate-700">{f.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
            <h3 className="font-bold text-lg mb-2">📧 Free AI Brief</h3>
            <p className="text-sm text-slate-700 mb-3">The 5 biggest AI tool launches and deals every week.</p>
            <a href="#newsletter" className="block text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition">Subscribe Free</a>
          </div>
          <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDE} />
          {related.length > 0 && (
            <div>
              <h3 className="font-bold text-lg mb-3">Related</h3>
              <div className="space-y-3">
                {related.map((p) => <PostCard key={p.slug} post={p} />)}
              </div>
            </div>
          )}
        </aside>
      </div>
    </article>
  );
}

// Parse "## FAQ" markdown sections into structured FAQ data
function parseFAQs(content) {
  const faqMatch = content.match(/##\s*FAQ[^\n]*\n([\s\S]+?)(?=\n##\s|\n#\s|$)/i);
  if (!faqMatch) return null;
  const block = faqMatch[1];
  const pairs = [];
  const re = /###\s+(.+?)\n([\s\S]+?)(?=\n###|\n##\s|$)/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    pairs.push({ question: m[1].trim(), answer: m[2].trim().replace(/\n+/g, ' ') });
  }
  return pairs.length > 0 ? pairs : null;
}

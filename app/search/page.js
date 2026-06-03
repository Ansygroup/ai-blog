import { getAllPosts } from '../../lib/posts';
import { siteConfig } from '../../lib/config';

export const metadata = {
  title: 'Search AI Tools, Reviews & Tutorials',
  description: `Search ${getAllPosts().length}+ AI tool reviews, comparisons, and tutorials on ${siteConfig.name}. Find the best AI tools for your needs.`,
  alternates: { canonical: `${siteConfig.url}/search` },
  openGraph: { url: `${siteConfig.url}/search` },
};

export default function SearchPage() {
  const posts = getAllPosts();
  // Inline search index as JSON for client-side fuzzy filter
  const index = posts.map((p) => ({
    slug: p.slug, title: p.title, excerpt: p.excerpt, category: p.category, tags: p.tags || [], date: p.date,
  }));
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-extrabold mb-3">Search</h1>
      <p className="text-slate-600 mb-6">Find any review, comparison, or tutorial.</p>
      <input id="search" type="search" placeholder="Type to search..." autoFocus className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none mb-6" />
      <div id="results" className="space-y-3" />
      <script type="application/json" id="search-index" dangerouslySetInnerHTML={{ __html: JSON.stringify(index) }} />
      {/* Search index contains only post titles, slugs, and excerpts from the author's own content. No user input. */}
      <script dangerouslySetInnerHTML={{ __html: `
        (function(){
          const idx = JSON.parse(document.getElementById('search-index').textContent);
          const input = document.getElementById('search');
          const out = document.getElementById('results');
          function render(items){
            if (!items.length) { out.innerHTML = '<p class="text-slate-500">No results.</p>'; return; }
            out.innerHTML = items.slice(0, 30).map(p => '<a href="/posts/'+p.slug+'" class="block p-4 bg-white border border-slate-200 rounded-lg hover:border-blue-500 transition"><div class="text-xs text-slate-500 mb-1">'+p.category+' · '+new Date(p.date).toLocaleDateString()+'</div><div class="font-semibold text-lg">'+p.title+'</div><div class="text-sm text-slate-600 mt-1">'+p.excerpt+'</div></a>').join('');
          }
          input.addEventListener('input', () => {
            const q = input.value.toLowerCase().trim();
            if (!q) { out.innerHTML = ''; return; }
            const r = idx.filter(p => (p.title+' '+p.excerpt+' '+(p.tags||[]).join(' ')).toLowerCase().includes(q));
            render(r);
          });
        })();
      `}} />
    </div>
  );
}

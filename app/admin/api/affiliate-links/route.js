import fs from 'fs';
import path from 'path';

export const revalidate = 600;

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');
const DB_PATH = path.join(process.cwd(), 'scripts', 'amazon-db.json');

export async function GET() {
  try {
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));

    // Build product list
    const products = [];
    const productByAsin = {};
    for (const [catKey, cat] of Object.entries(db.categories)) {
      for (const p of cat.products) {
        products.push({ ...p, category: cat.name, catKey });
        productByAsin[p.asin] = { ...p, category: cat.name, catKey };
      }
    }

    // Scan posts for affiliate links
    const linkedPosts = {};
    const unlinkedProducts = new Set(products.map(p => p.asin));

    for (const file of files) {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
      const slug = file.replace(/\.mdx$/, '');
      const fm = raw.match(/^---\r?\n([\s\S]+?)\r?\n---/);
      const get = (k) => fm ? (fm[1].match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm')) || [])[1]?.trim() || '' : '';
      const title = get('title') || slug;

      // Find ASINs in content
      const asins = [...raw.matchAll(/[A-Z0-9]{10}/g)].map(m => m[0]).filter(a => productByAsin[a]);

      for (const asin of asins) {
        if (!linkedPosts[asin]) linkedPosts[asin] = [];
        linkedPosts[asin].push({ slug, title });
        unlinkedProducts.delete(asin);
      }
    }

    // Posts with zero affiliate links
    const zeroLinkPosts = [];
    for (const file of files) {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
      const hasAffiliate = /amazon\.com\/dp\//.test(raw);
      if (!hasAffiliate) {
        const fm = raw.match(/^---\r?\n([\s\S]+?)\r?\n---/);
        const get = (k) => fm ? (fm[1].match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm')) || [])[1]?.trim() || '' : '';
        if (!get('draft')) {
          zeroLinkPosts.push({ slug: file.replace(/\.mdx$/, ''), title: get('title') || file.replace(/\.mdx$/, ''), category: get('category') });
        }
      }
    }

    // Stats
    const totalLinked = Object.keys(linkedPosts).length;
    const linkedCount = products.filter(p => linkedPosts[p.asin]).length;

    return Response.json({
      totalProducts: products.length,
      linkedProducts: linkedCount,
      unlinkedProducts: unlinkedProducts.size,
      totalAffiliateLinks: Object.values(linkedPosts).flat().length,
      postsWithNoLinks: zeroLinkPosts.length,
      products: products.map(p => ({
        ...p,
        linkedIn: linkedPosts[p.asin] || [],
        linked: !!linkedPosts[p.asin],
      })).filter(p => p.linked || true).slice(0, 500),
      zeroLinkPosts: zeroLinkPosts.slice(0, 100),
      categoryStats: products.reduce((acc, p) => {
        if (!acc[p.catKey]) acc[p.catKey] = { name: p.category, total: 0, linked: 0 };
        acc[p.catKey].total++;
        if (linkedPosts[p.asin]) acc[p.catKey].linked++;
        return acc;
      }, {}),
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

import fs from 'fs';
import path from 'path';

export const revalidate = 600;

const DB_PATH = path.join(process.cwd(), 'scripts', 'amazon-db.json');
const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

export async function GET() {
  try {
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    const allProducts = [];
    for (const [, cat] of Object.entries(db.categories)) {
      for (const p of cat.products) {
        allProducts.push({ ...p, catName: cat.name });
      }
    }

    const postFiles = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
    const postTitles = {};
    for (const file of postFiles.slice(0, 200)) {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8').replace(/\r\n/g, '\n');
      const title = (raw.match(/^title:\s*"(.+?)"/m) || [])[1] || file.replace(/\.mdx$/, '');
      postTitles[file.replace(/\.mdx$/, '')] = title;
    }

    return Response.json({
      categories: db.categories,
      totalProducts: allProducts.length,
      totalCategories: Object.keys(db.categories).length,
      lastUpdated: db.lastUpdated,
      postCount: Object.keys(postTitles).length,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

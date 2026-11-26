// Run only in the Cloudflare build checkout (never on Vercel / locally by accident).
// Turns the app into a static export by removing server-only parts.
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const rm = p => fs.rmSync(path.join(root, p), {recursive: true, force: true});
for (const p of ['middleware.js', 'app/admin', 'app/api', 'app/og']) rm(p);
// next.config: static export, unoptimized images, no server-only headers/redirects
const cfgPath = path.join(root, 'next.config.js');
let cfg = fs.readFileSync(cfgPath, 'utf8');
cfg = cfg.replace("reactStrictMode: true,", "reactStrictMode: true,\n  output: 'export',\n  trailingSlash: false,");
cfg = cfg.replace("dangerouslyAllowSVG: true,", "unoptimized: true,\n    dangerouslyAllowSVG: true,");
cfg = cfg.replace(/async headers\(\) \{[\s\S]*?\n  \},\n  async redirects\(\) \{[\s\S]*?\n  \},\n/, '');
fs.writeFileSync(cfgPath, cfg);
// make dynamic pages static where possible
function walk(d) { for (const e of fs.readdirSync(d, {withFileTypes: true})) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (/\.(js|jsx)$/.test(e.name)) { let s = fs.readFileSync(f, 'utf8'); if (s.includes("dynamic = 'force-dynamic'")) { fs.writeFileSync(f, s.replace("dynamic = 'force-dynamic'", "dynamic = 'force-static'")); } } } }
walk(path.join(root, 'app'));
// tag pages: prerender every tag whose slug round-trips (these pages are noindex anyway)
const tagPath = path.join(root, 'app/tag/[slug]/page.js');
let tag = fs.readFileSync(tagPath, 'utf8');
tag += `
export function generateStaticParams() {
  return getAllTags()
    .map((t) => slugify(t.name))
    .filter((slug, i, a) => slug && a.indexOf(slug) === i)
    .filter((slug) => getAllPosts().some((p) => (p.tags || []).map((x) => String(x).toLowerCase()).includes(slug.replace(/-/g, ' '))))
    .map((slug) => ({ slug }));
}
export const dynamicParams = false;
`;
fs.writeFileSync(tagPath, tag);
fs.copyFileSync(path.join(root, 'cf/_headers'), path.join(root, 'public/_headers'));
fs.copyFileSync(path.join(root, 'cf/_redirects'), path.join(root, 'public/_redirects'));
console.log('prepared for static export');

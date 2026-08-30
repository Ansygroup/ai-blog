import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const dir = 'content/posts';
const files = fs.readdirSync(dir).filter(x => x.endsWith('.mdx'));
const parseErrors = [];
let drafts = 0, published = 0, nodate = 0, noexcerpt = 0, notitle = 0, noseo = 0;
let totalWords = 0, thin = 0, crlf = 0;
const cats = {};
const years = {};
let affiliateMentions = 0;
let missingCover = 0, brokenCover = 0;

for (const fn of files) {
  const raw = fs.readFileSync(path.join(dir, fn), 'utf8');
  if (raw.includes('\r\n')) crlf++;
  let m, content;
  try { ({ data: m, content } = matter(raw)); }
  catch (e) { parseErrors.push(fn + ' :: ' + e.reason); continue; }

  if (m.draft) drafts++; else published++;
  if (!m.date) nodate++; else { const y = String(m.date).slice(0,4); years[y]=(years[y]||0)+1; }
  if (!m.excerpt) noexcerpt++;
  if (!m.title) notitle++;
  if (m.seoScore == null) noseo++;
  const cat = m.category || 'none'; cats[cat] = (cats[cat] || 0) + 1;
  const words = content.split(/\s+/).length; totalWords += words; if (words < 700) thin++;
  if (/affiliate|jasper|surfer|nordvpn|copy\.ai/i.test(content + JSON.stringify(m))) affiliateMentions++;
  if (!m.cover) missingCover++;
  else if (/\n\s+\//.test(m.cover)) brokenCover++; // duplicated cover line artifact
}

console.log('total mdx:', files.length);
console.log('PARSE ERRORS (corrupt frontmatter):', parseErrors.length);
parseErrors.slice(0, 20).forEach(e => console.log('  -', e));
console.log('published:', published, '| drafts:', drafts);
console.log('missing date:', nodate, '| missing excerpt:', noexcerpt, '| missing title:', notitle, '| missing seoScore:', noseo);
console.log('missing cover:', missingCover, '| broken cover (dup line):', brokenCover);
console.log('CRLF files:', crlf, '/', files.length);
console.log('avg words:', Math.round(totalWords / files.length), '| thin(<700):', thin, '(', Math.round(thin/files.length*100), '%)');
console.log('by year:', JSON.stringify(years));
console.log('categories:', JSON.stringify(cats, null, 0));
console.log('posts mentioning affiliates:', affiliateMentions);

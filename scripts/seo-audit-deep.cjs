const fs = require('fs');
const path = require('path');

const POSTS_DIR = 'content/posts';
const STOP = new Set(['the','and','for','with','that','this','from','your','are','was','but','not','you','all','can','has','have','will','use','using','into','more','their','what','when','how','our','out','who','why','best','top','new','ai','tool','tools','2026','2025','a','an','of','to','in','on','is','it','as','by','at','or','be','we','they','i','he','she','his','her','its','get','got','one','two','per','via','via']);

function words(t){ return (t.replace(/[#>*_`\-\[\](){}]/g,' ').match(/\b[A-Za-z]+\b/g)||[]); }
function kw(t, n=12){
  const m={};
  for(const w of words(t)){ const l=w.toLowerCase(); if(l.length<4||STOP.has(l)) continue; m[l]=(m[l]||0)+1; }
  return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,n).map(x=>x[0]);
}

const files = fs.readdirSync(POSTS_DIR).filter(f=>/\.mdx?$/.test(f));
let totalWords=0, thin=[], lens=[], allKw={}, missingYear=0, noExcerpt=0, posts=[];

for(const f of files){
  const raw = fs.readFileSync(path.join(POSTS_DIR,f),'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---/);
  let meta = {};
  if(fm){ fm[1].split('\n').forEach(l=>{ const m=l.match(/^(\w+):\s*(.*)$/); if(m) meta[m[1].toLowerCase()]=m[2].trim(); }); }
  const body = raw.replace(/^---\n[\s\S]*?\n---/,'');
  const w = words(body).length;
  totalWords += w; lens.push(w);
  if(w<700) thin.push(f+'('+w+')');
  if(!/date:\s*[\"']?\d{4}/.test(raw)) missingYear++;
  if(!meta.excerpt) noExcerpt++;
  const k = kw(body);
  k.forEach(x=>allKw[x]=(allKw[x]||0)+1);
  posts.push({f,w,k,cat:meta.category||'uncat'});
}
lens.sort((a,b)=>a-b);

// category gaps
const catCount={};
posts.forEach(p=>catCount[p.cat]=(catCount[p.cat]||0)+1);
const topKw = Object.entries(allKw).sort((a,b)=>b[1]-a[1]).slice(25);

console.log('=== AI BLOG SEO AUDIT ===');
console.log('posts:', files.length);
console.log('avg_words:', Math.round(totalWords/files.length));
console.log('thin_lt700:', thin.length, '| missing_year:', missingYear, '| no_excerpt:', noExcerpt);
console.log('categories:', Object.keys(catCount).length, '| top:', Object.entries(catCount).sort((a,b)=>b[1]-a[1]).slice(0,10).map(x=>x[0]+':'+x[1]).join(', '));
console.log('top_keywords:', topKw.map(x=>x[0]+'('+x[1]+')').join(', '));
console.log('thin_sample:', thin.slice(0,12).join(', '));

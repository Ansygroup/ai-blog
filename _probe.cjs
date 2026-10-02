const fs = require('fs');
const src = fs.readFileSync('scripts/ai-blog-doctor.mjs', 'utf8');
const start = src.indexOf('const LINK_RE =');
const end = src.indexOf('// ---------- 3. fake claims');
const decl = src.slice(start, end);
const v = decl.replace(/const LINK_RE/g, 'var LINK_RE').replace('const toRelative', 'var toRelative');
eval(v);

const f = 'content/posts/ai-ad-copy-tutorial-2026.mdx';
const s = fs.readFileSync(f, 'utf8');
const L = s.split('\n').find((l) => l.includes('Advanced strategies include'));

let prev, o = L, g = 0;
do {
  prev = o;
  o = o
    .replace(LINK_RE_ABS_B, (_, w, a, b, l) => {
      const r = toRelative(l);
      return r ? '[' + (w || '') + '](' + r + ')' : '[' + (w || '') + '](' + l + ')';
    })
    .replace(LINK_RE_ABS, (_, w, a, b, l) => {
      const r = toRelative(l);
      return r ? '[' + (w || '') + '](' + r + ')' : '[' + (w || '') + '](' + l + ')';
    });
  g++;
} while (o !== prev && g < 20);

console.log('BEFORE:\n' + L.slice(0, 240));
console.log('\nAFTER:\n' + o.slice(0, 240));
LINK_RE_ABS.lastIndex = 0;
console.log('\nresidual ABS nested:', LINK_RE_ABS.test(o));

const fs = require('fs');
const path = require('path');
const glob = require('child_process').execSync('ls content/posts/*.mdx').toString().trim().split('\n');
let present = 0, missing = 0, unsplash = 0;
const missingList = [];
for (const p of glob) {
  const c = fs.readFileSync(p, 'utf8');
  const m = c.match(/cover:\s*['"]?([^'"\n]+)/);
  if (!m) continue;
  const cv = m[1].trim().replace(/^'|'$/g, '');
  if (cv.startsWith('http')) { unsplash++; }
  else if (cv.startsWith('/images/')) {
    const fn = 'public' + cv;
    if (fs.existsSync(fn)) present++;
    else { missing++; if (missingList.length < 12) missingList.push(cv); }
  }
}
console.log('local present:', present);
console.log('local MISSING:', missing);
console.log('unsplash (external):', unsplash);
console.log('--- sample missing covers ---');
missingList.forEach(x => console.log(x));

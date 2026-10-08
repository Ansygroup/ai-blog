const fs = require('fs');
const root = 'C:/Users/ansy0/ai-blog';
const d = root + '/content/posts';
const files = fs.readdirSync(d).filter((x) => /\.mdx?$/.test(x));
let ok = [];
let missing = [];
for (const f of files) {
  const c = fs.readFileSync(d + '/' + f, 'utf8');
  const m = c.match(/^cover:\s*["']?([^"'\n]+?)["']?\s*$/m);
  const v = m ? m[1].trim() : '';
  if (!v) { missing.push(f + ' : NOFIELD'); continue; }
  const p = v.startsWith('/') ? root + '/public' + v : root + '/' + v;
  if (fs.existsSync(p)) ok.push({ f, p, size: fs.statSync(p).size });
  else missing.push(f + ' : ' + v);
}
console.log('total_posts', files.length);
console.log('cover_file_present', ok.length);
console.log('cover_missing', missing.length);
console.log('missing_sample:', missing.slice(0, 5).join(' | '));
const sizes = {};
for (const o of ok) sizes[o.size] = (sizes[o.size] || 0) + 1;
const dup = Object.entries(sizes).filter(([, v]) => v >= 3).sort((a, b) => b[1] - a[1]);
console.log('byte_sizes_shared_by_3plus_posts (duplicate = suspicious):');
dup.slice(0, 12).forEach(([s, c]) => console.log('  bytes=' + s + ' posts=' + c));
const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'content/posts');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mdx'));
let fixed = 0;

for (const file of files) {
  const fp = path.join(dir, file);
  let raw = fs.readFileSync(fp, 'utf8');

  // Match excerpt: >- block scalar with following indented lines
  // Handles cases like:
  // excerpt: >-
  //   Some text
  //   More text
  // or excerpt: >
  //   Some text
  const regex = /^(excerpt:\s*)>(?:-)?\n((?:  .*\n?)*)/m;
  const match = raw.match(regex);
  if (!match) continue;

  // Fold the indented lines into a single line
  const folded = match[2]
    .split('\n')
    .map(line => line.replace(/^  /, '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ');

  if (!folded) continue;

  // Replace with inline quoted format, escaping internal double quotes
  const escaped = folded.replace(/"/g, '\\"');
  const replacement = `${match[1]}"${escaped}"`;
  raw = raw.replace(regex, replacement);

  fs.writeFileSync(fp, raw, 'utf8');
  fixed++;
  console.log('Fixed:', file, `(${folded.length} chars)`);
}

console.log('\nConverted block scalars:', fixed);

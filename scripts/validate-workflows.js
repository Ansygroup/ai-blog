const fs = require('fs');
const path = require('path');

const required = ['name:', 'on:', 'jobs:'];
let allOk = true;
for (const f of ['.github/workflows/deploy.yml', '.github/workflows/scheduled-content.yml']) {
  const fp = path.resolve(__dirname, '..', f);
  if (!fs.existsSync(fp)) { console.log('  ❌', f, '| missing'); allOk = false; continue; }
  const c = fs.readFileSync(fp, 'utf8');
  const missing = required.filter((k) => !c.includes(k));
  if (missing.length > 0) { console.log('  ❌', f, '| missing keys:', missing.join(', ')); allOk = false; continue; }
  const jobNames = [...c.matchAll(/^  ([a-z][a-z0-9-]*):\s*$/gm)].map((m) => m[1]);
  console.log('  ✅', f, '| jobs:', jobNames.join(', ') || '(check manually)');
}
process.exit(allOk ? 0 : 1);

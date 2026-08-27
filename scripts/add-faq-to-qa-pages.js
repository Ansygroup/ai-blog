const fs = require('fs');
const path = require('path');
const qa = require('../data/qa-bank.json');
const OUT = 'content/posts';

// Build an FAQ block from the question + 2 related questions from the bank
function buildFaqBlock(item) {
  // pick 2 other questions that share a keyword with this one
  const others = qa.filter(x => x.question !== item.question);
  const words = item.question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const scored = others.map(o => {
    const ow = o.question.toLowerCase();
    const score = words.reduce((s,w) => s + (ow.includes(w) ? 1 : 0), 0);
    return { o, score };
  }).sort((a,b) => b.score - a.score).slice(0, 2).map(x => x.o);
  const items = [item, ...scored];
  let block = '\n## FAQ\n\n';
  for (const it of items) {
    block += `### ${it.question}\n${it.answer} [${it.link_text}](/posts/${it.link_slug}).\n\n`;
  }
  return block;
}

let updated = 0;
for (const item of qa) {
  const slug = 'qa-' + item.question.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);
  const file = path.join(OUT, slug + '.mdx');
  if (!fs.existsSync(file)) continue;
  let c = fs.readFileSync(file, 'utf8');
  // remove existing FAQ block if present (idempotent)
  c = c.replace(/\n## FAQ\n[\s\S]*$/, '');
  // strip trailing "Answer sourced from..." if it's after the FAQ was removed
  c = c.replace(/\n\n\*Answer sourced from[\s\S]*$/, '');
  // re-append FAQ + source note
  c = c.trimEnd() + '\n' + buildFaqBlock(item) + '\n*Answer sourced from community discussion (' + item.source + ').*\n';
  fs.writeFileSync(file, c);
  updated++;
  console.log('updated:', slug);
}
console.log('TOTAL updated:', updated);

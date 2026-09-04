const fs = require('fs');
const filePath = 'scripts/keyword-queue.json';
let content = fs.readFileSync(filePath, 'utf8');
// Split by the conflict marker
const headSplit = content.split('<<<<<<< HEAD');
if (headSplit.length !== 2) {
  console.error('Expected exactly one <<<<<<< HEAD marker');
  process.exit(1);
}
const beforeHead = headSplit[0]; // should be '[\n'
const afterHead = headSplit[1];
// Now split afterHead by '======='
const equalSplit = afterHead.split('=======');
if (equalSplit.length !== 2) {
  console.error('Expected exactly one ======= marker after HEAD');
  process.exit(1);
}
const headSection = equalSplit[0].trim(); // old format
const afterEqual = equalSplit[1];
// Now split afterEqual by the line that starts with '>>>>>>>'
// We'll find the index of the line that starts with '>>>>>>>'
const lines = afterEqual.split('\n');
let mergeLines = [];
let found = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith('>>>>>>>')) {
    found = true;
    // skip this line
    break;
  }
  mergeLines.push(lines[i]);
}
if (!found) {
  console.error('Could not find >>>>>>> line');
  process.exit(1);
}
const mergeSection = mergeLines.join('\n').trim();
// Now parse
let headArr, mergeArr;
try {
  headArr = JSON.parse(headSection);
} catch (e) {
  console.error('Failed to parse HEAD section (old format):', e.message);
  process.exit(1);
}
try {
  mergeArr = JSON.parse(mergeSection);
} catch (e) {
  console.error('Failed to parse MERGE_HEAD section (new format):', e.message);
  process.exit(1);
}
if (!Array.isArray(headArr) || !Array.isArray(mergeArr)) {
  console.error('Sections are not JSON arrays');
  process.exit(1);
}
// Build set of existing keywords from merge side (new format)
const mergeKeys = new Set();
mergeArr.forEach(item => {
  if (item.keyword) mergeKeys.add(item.keyword.toLowerCase());
});
// Convert head side entries (old format) to new format and add if not duplicate
headArr.forEach(item => {
  const topic = item.topic;
  if (!topic) return;
  const keyLower = topic.toLowerCase();
  if (!mergeKeys.has(keyLower)) {
    // Convert to new format (guess category from item.category, else 'Reviews')
    const newItem = {
      keyword: topic,
      category: item.category || 'Reviews',
      source: 'competitor', // assume
      sourceName: 'merged',
      sourceUrl: '',
      tier: 2,
      addedAt: new Date().toISOString()
    };
    mergeArr.push(newItem);
    mergeKeys.add(keyLower);
    console.log(`Added preserved topic: ${topic}`);
  }
});
// Write back
fs.writeFileSync(filePath, JSON.stringify(mergeArr, null, 2));
console.log(`Resolved keyword-queue.json: ${mergeArr.length} topics`);

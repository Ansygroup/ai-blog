const fs = require('fs');
const filePath = 'scripts/keyword-queue.json';
let content = fs.readFileSync(filePath, 'utf8');
// Find conflict markers
const headStart = content.indexOf('<<<<<<< HEAD');
const headEnd = content.indexOf('=======');
const mergeStart = headEnd + 7; // after '======='
const mergeEnd = content.indexOf('>>>>>>> MERGE_HEAD');
if (headStart === -1 || headEnd === -1 || mergeStart === -1 || mergeEnd === -1) {
  console.error('Conflict markers not found');
  process.exit(1);
}
const headSection = content.slice(headStart + '<<<<<<< HEAD\n'.length, headEnd).trim();
const mergeSection = content.slice(mergeStart, mergeEnd).trim();
// Parse JSON arrays
let headArr, mergeArr;
try {
  headArr = JSON.parse(headSection);
} catch (e) {
  console.error('Failed to parse HEAD section:', e.message);
  // If parsing fails, maybe the headSection is missing the outer brackets? Let's see.
  // Actually headSection should be a valid JSON array because it's between [ and the marker? Wait the file starts with '[' then newline then '  {' then marker.
  // So headSection includes the opening bracket? Let's check: The file starts with '[\n  { ...' so the headStart is at the line with '<<<<<<< HEAD' after the two objects.
  // That means headSection is the two objects lines (including the opening bracket? Actually the '[' is before the marker? Let's examine.
  // We'll instead take a different approach: extract the whole file and manually construct the merged array.
  process.exit(1);
}
try {
  mergeArr = JSON.parse(mergeSection);
} catch (e) {
  console.error('Failed to parse MERGE_HEAD section:', e.message);
  process.exit(1);
}
if (!Array.isArray(headArr) || !Array.isArray(mergeArr)) {
  console.error('Sections are not JSON arrays');
  process.exit(1);
// Build set of existing keywords from merge side (new format) in lowercase
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
// Write back merged array
fs.writeFileSync(filePath, JSON.stringify(mergeArr, null, 2));
console.log(`Merged keyword-queue.json: ${mergeArr.length} topics`);

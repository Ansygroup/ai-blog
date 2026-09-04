const fs = require('fs');
const filePath = 'scripts/keyword-queue.json';
let content = fs.readFileSync(filePath, 'utf8');
// Find markers
const headStart = content.indexOf('<<<<<<< HEAD');
const headEnd = content.indexOf('=======');
const mergeStart = headEnd + 7; // after '======='
const mergeEnd = content.indexOf('>>>>>>> MERGE_HEAD');
if (headStart === -1 || headEnd === -1 || mergeStart === -1 || mergeEnd === -1) {
  console.error('Markers not found');
  process.exit(1);
}
const before = content.slice(0, headStart);
const after = content.slice(mergeEnd);
// Extract merge section (theirs)
const mergeSection = content.slice(mergeStart, mergeEnd).trim();
let mergeArr;
try {
  mergeArr = JSON.parse(mergeSection);
} catch (e) {
  console.error('Failed to parse merge section as JSON:', e.message);
  process.exit(1);
}
if (!Array.isArray(mergeArr)) {
  console.error('Merge section is not an array');
  process.exit(1);
// Build set of existing keywords (lowercase) for quick lookup
const existingKeywords = new Set();
mergeArr.forEach(item => {
  if (item.keyword) existingKeywords.add(item.keyword.toLowerCase());
});
// Topics to add from HEAD side (old format)
const headTopics = [
  { topic: 'midjourney vs firefly vs dalle 2026', category: 'Comparisons' },
  { topic: 'ai tools for freelancers 2026', category: 'Best Of' }
];
// Add if not present
let addedCount = 0;
headTopics.forEach(topicObj => {
  const keyLower = topicObj.topic.toLowerCase();
  if (!existingKeywords.has(keyLower)) {
    const newItem = {
      keyword: topicObj.topic,
      category: topicObj.category,
      source: 'competitor', // assume
      sourceName: 'merged',
      sourceUrl: '',
      tier: 2,
      addedAt: new Date().toISOString()
    };
    mergeArr.push(newItem);
    existingKeywords.add(keyLower);
    addedCount++;
    console.log(`Added preserved topic: ${topicObj.topic}`);
  }
});
// Write back the resolved array
const resolvedArrayStr = JSON.stringify(mergeArr, null, 2);
const newContent = before + resolvedArrayStr + after;
fs.writeFileSync(filePath, newContent);
console.log(`Resolved keyword-queue.json: ${mergeArr.length} topics (added ${addedCount} from HEAD)`);

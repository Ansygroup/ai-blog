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
// Now we need to parse headSection as an array of objects (old format) and mergeSection as an array of objects (new format)
// However, the headSection might be missing the outer brackets. Let's try to parse it as is, and if it fails, try wrapping with brackets.
let headArr;
try {
  headArr = JSON.parse(headSection);
} catch (e) {
  // If fails, try wrapping with brackets
  try {
    headArr = JSON.parse('[' + headSection + ']');
  } catch (e2) {
    console.error('Failed to parse headSection as JSON:', e.message);
    process.exit(1);
  }
}
let mergeArr;
try {
  mergeArr = JSON.parse(mergeSection);
} catch (e) {
  console.error('Failed to parse mergeSection as JSON:', e.message);
  process.exit(1);
}
if (!Array.isArray(headArr) || !Array.isArray(mergeArr)) {
  console.error('One of the sections is not an array');
  process.exit(1);
// Build set of existing keywords from mergeSection (lowercase)
const mergeKeywordsSet = new Set();
mergeArr.forEach(item => {
  if (item.keyword) mergeKeywordsSet.add(item.keyword.toLowerCase());
});
// Convert headSection objects to new format
const converted = headArr.map(item => ({
  keyword: item.topic,
  category: item.category,
  source: 'competitor', // assume
  sourceName: 'merged',
  sourceUrl: '',
  tier: 2,
  addedAt: new Date().toISOString()
}));
// Filter out those already present
const toAdd = converted.filter(item => !mergeKeywordsSet.has(item.keyword.toLowerCase()));
// Add them to mergeArr
mergeArr.push(...toAdd);
// Write back the merged array
fs.writeFileSync(filePath, JSON.stringify(mergeArr, null, 2));
console.log(`Resolved keyword-queue.json: ${mergeArr.length} topics (added ${toAdd.length} from HEAD)`);

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
// Parse headSection as JSON array (it might be missing outer brackets? Let's try to parse as is, if fails, wrap with [ ])
let headArr;
try {
  headArr = JSON.parse(headSection);
} catch (e) {
  // If fails, maybe it's missing the outer brackets because the file starts with '[' before the marker?
  // Actually the headSection is the content between the markers, which should be a valid JSON array because the file starts with '[' and then newline, then objects, then marker.
  // Let's see if adding brackets helps.
  try {
    headArr = JSON.parse('[' + headSection + ']');
  } catch (e2) {
    console.error('Failed to parse headSection as JSON:', e.message);
    console.log('headSection first 200 chars:', headSection.substring(0, 200));
    process.exit(1);
  }
}
let mergeArr;
try {
  mergeArr = JSON.parse(mergeSection);
} catch (e) {
  console.error('Failed to parse mergeSection as JSON:', e.message);
  console.log('mergeSection first 200 chars:', mergeSection.substring(0, 200));
  process.exit(1);
}
if (!Array.isArray(headArr) || !Array.isArray(mergeArr)) {
  console.error('One of the sections is not an array: headArr Array.isArray=', Array.isArray(headArr), 'mergeArr Array.isArray=', Array.isArray(mergeArr));
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
  sourceName: 'merged', // we can set to 'merged' to indicate it's from our side
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

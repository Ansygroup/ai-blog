const fs = require('fs');
// Get the incoming version (theirs) from the commit we are applying (f265d6f2d)
const { execSync } = require('child_process');
let theirsArray;
try {
  const theirsRaw = execSync('git show f265d6f2d:scripts/keyword-queue.json', { encoding: 'utf8' });
  theirsArray = JSON.parse(theirsRaw);
} catch (e) {
  console.error('Failed to get theirs version from git:', e.message);
  process.exit(1);
}
// Get our two topics from HEAD (the version before the rebase) - we can get from git show HEAD:scripts/keyword-queue.json
let ourTopics;
try {
  const ourRaw = execSync('git show HEAD:scripts/keyword-queue.json', { encoding: 'utf8' });
  const ourArray = JSON.parse(ourRaw);
  // We expect two objects at the end? Actually we don't know. Let's just take all objects from ourArray that have a 'topic' field (old format).
  ourTopics = ourArray.filter(item => item.topic !== undefined);
} catch (e) {
  console.error('Failed to get our version from git:', e.message);
  // Fallback: we know the two topics from the conflict.
  ourTopics = [
    { topic: 'midjourney vs firefly vs dalle 2026', category: 'Comparisons' },
    { topic: 'ai tools for freelancers 2026', category: 'Best Of' }
  ];
}
// Convert ourTopics to new format
const ourNewFormat = ourTopics.map(topicObj => ({
  keyword: topicObj.topic,
  category: topicObj.category,
  source: 'competitor', // assume
  sourceName: 'HEAD', // we can set to 'HEAD' or 'merged'
  sourceUrl: '',
  tier: 2,
  addedAt: new Date().toISOString()
}));
// Build set of existing keywords from theirsArray (lowercase)
const existingKeywords = new Set();
theirsArray.forEach(item => {
  if (item.keyword) {
    existingKeywords.add(item.keyword.toLowerCase());
  }
});
// Add our new format topics if not already present
let addedCount = 0;
ourNewFormat.forEach(item => {
  const keyLower = item.keyword.toLowerCase();
  if (!existingKeywords.has(keyLower)) {
    theirsArray.push(item);
    existingKeywords.add(keyLower);
    addedCount++;
    console.log(`Added preserved topic: ${item.keyword}`);
  }
});
// Write back
fs.writeFileSync('scripts/keyword-queue.json', JSON.stringify(theirsArray, null, 2));
console.log(`Resolved keyword-queue.json: ${theirsArray.length} topics (added ${addedCount} from HEAD)`);

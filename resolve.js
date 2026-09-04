const fs = require('fs');
const path = require('path');
const filePath = path.join('scripts', 'keyword-queue.json');
let content = fs.readFileSync(filePath, 'utf8');
// Remove conflict markers
content = content.replace(/^<<<<<<< HEAD[\s\S]*?^=======\s*\n/m, '');
content = content.replace(/^>>>>>>> MERGE_HEAD[\s\S]*$/m, '');
// Now content should be the merged array but maybe with extra whitespace
let arr;
try {
  arr = JSON.parse(content.trim());
} catch (e) {
  // If parsing fails, maybe the content is missing the outer brackets?
  // Let's see if it starts with '{' (meaning it's just the object lines)
  const trimmed = content.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    // It's a single object? Actually we expect multiple objects separated by commas.
    // Maybe the array brackets were lost.
    // Let's wrap with [ and ] and see.
    try {
      arr = JSON.parse('[' + trimmed + ']');
    } catch (e2) {
      console.error('Still failed to parse:', e2.message);
      process.exit(1);
    }
  } else {
    console.error('Failed to parse JSON:', e.message);
    process.exit(1);
  }
}
if (!Array.isArray(arr)) {
  console.error('Parsed content is not an array');
  process.exit(1);
}
console.log(`Resolved queue length: ${arr.length}`);
fs.writeFileSync(filePath, JSON.stringify(arr, null, 2));

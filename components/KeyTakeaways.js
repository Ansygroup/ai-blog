import { Lightbulb } from 'lucide-react';

const fs = require('fs');
const path = require('path');

// ✅ Direct JSON import would fail at build — read file instead
function getTakeaways() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'takeaways.json');
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

export default function KeyTakeaways({ slug }) {
  const data = getTakeaways();
  const post = data?.[slug];
  if (!post?.points || post.points.length < 2) return null;

  return (
    <div className="rounded-xl border border-blue-200 dark:border-blue-900/30 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 p-5 mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-5 h-5 text-amber-500" />
        <h2 className="text-sm font-bold text-slate-900 dark:text-dark-text">Key Takeaways</h2>
      </div>
      <ul className="space-y-2">
        {post.points.map((point, i) => (
          <li key={i} className="text-sm text-slate-700 dark:text-dark-text flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

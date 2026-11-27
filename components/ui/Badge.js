const categoryStyles = {
  Reviews: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  Comparisons: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
  Tutorials: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300',
  'Best Of': 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300',
  'AI News': 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
};

export default function Badge({ children, category, className = '' }) {
  const color = categoryStyles[children] || categoryStyles[category] || 'bg-slate-100 text-slate-700 dark:bg-dark-card dark:text-dark-text';
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-md font-semibold tracking-wide text-xs ${color} ${className}`}>
      {children}
    </span>
  );
}

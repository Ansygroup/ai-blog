const categoryStyles = {
  Reviews: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  Comparisons: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  Tutorials: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  'Best Of': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'AI News': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

export default function Badge({ children, category, className = '' }) {
  const color = categoryStyles[children] || categoryStyles[category] || 'bg-slate-100 text-slate-700 dark:bg-dark-card dark:text-dark-text';
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider text-xs ${color} ${className}`}>
      {children}
    </span>
  );
}

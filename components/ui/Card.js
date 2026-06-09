export default function Card({ children, hover = true, className = '', as: Tag = 'div', ...props }) {
  const base = 'rounded-xl border border-slate-200 bg-white overflow-hidden dark:bg-dark-card dark:border-dark-border transition-all duration-300';
  const hoverCls = hover ? 'hover:shadow-lg hover:border-brand-300 dark:hover:border-brand-600' : '';
  return (
    <Tag className={`${base} ${hoverCls} ${className}`} {...props}>
      {children}
    </Tag>
  );
}

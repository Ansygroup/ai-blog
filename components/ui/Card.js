export default function Card({ children, hover = true, className = '', as: Tag = 'div', ...props }) {
  const base = 'rounded-xl border border-slate-200 bg-white overflow-hidden dark:bg-dark-card dark:border-dark-border transition duration-200';
  const hoverCls = hover ? 'hover:border-slate-400 hover:shadow-md dark:hover:border-slate-500' : '';
  return (
    <Tag className={`${base} ${hoverCls} ${className}`} {...props}>
      {children}
    </Tag>
  );
}

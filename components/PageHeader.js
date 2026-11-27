const BASE = 'https://ansygroup.github.io/blog-images/';
export default function PageHeader({ image, title, lead }) {
  return (
    <header className="mb-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={BASE + image} alt="" width="1200" height="630" loading="eager" className="w-full h-auto rounded-2xl border border-slate-200 dark:border-dark-border mb-6" />
      <h1 className="text-3xl md:text-4xl font-heading font-bold tracking-tight">{title}</h1>
      {lead ? <p className="mt-3 text-lg text-slate-600 dark:text-dark-muted">{lead}</p> : null}
    </header>
  );
}

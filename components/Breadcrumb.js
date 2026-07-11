import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { siteConfig } from '../lib/config';
import { breadcrumbJsonLd } from '../lib/schema';

export default function Breadcrumb({ items }) {
  return (
    <>
      <script id="ld-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify(breadcrumbJsonLd(items.map((item) => ({
          name: item.name,
          url: item.href.startsWith('http') ? item.href : `${siteConfig.url}${item.href}`,
        })))),
      }} />
      <nav className="text-sm text-slate-500 mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/" className="hover:text-blue-600 flex items-center gap-1">
              <Home className="w-4 h-4" aria-hidden="true" />
              <span className="sr-only">Home</span>
            </Link>
          </li>
          {items.map((item, i) => (
            <li key={item.href} className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-slate-300" aria-hidden="true" />
              {i === items.length - 1 ? (
                <span className="text-slate-700 truncate max-w-xs font-medium">{item.name}</span>
              ) : (
                <Link href={item.href} className="hover:text-blue-600 capitalize">{item.name}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}

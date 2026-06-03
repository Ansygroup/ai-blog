import Link from 'next/link';
import { siteConfig } from '../lib/config';
import { getAllCategories } from '../lib/posts';

export default function Header() {
  const categories = getAllCategories();
  const navLinks = [
    { href: '/reviews', label: 'Reviews' },
    { href: '/comparisons', label: 'Comparisons' },
    { href: '/tutorials', label: 'Tutorials' },
    ...(categories.some((c) => c.name === 'Best Of') ? [{ href: '/best', label: 'Best Of' }] : []),
    { href: '/about', label: 'About' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl">🤖</span>
            <div>
              <div className="font-bold text-lg leading-tight group-hover:text-blue-600 transition">{siteConfig.name}</div>
              <div className="text-xs text-slate-500 leading-tight hidden sm:block">Honest AI reviews since 2024</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/" className="hover:text-blue-600 transition">Home</Link>
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-blue-600 transition">{link.label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/search" aria-label="Search" className="p-2 hover:bg-slate-100 rounded-full transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </Link>
            <a href="#newsletter" className="hidden sm:inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
              Subscribe
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

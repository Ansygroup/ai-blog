import Link from 'next/link';
import { siteConfig } from '../lib/config';
import { getAllCategories } from '../lib/posts';
import ThemeToggle from './ThemeToggle';
import MobileNav from './MobileNav';
import { Search } from 'lucide-react';

export default function Header() {
  const categories = getAllCategories();
  const navLinks = [
    { href: '/news', label: 'News' },
    { href: '/posts', label: 'Articles' },
    { href: '/reviews', label: 'Reviews' },
    { href: '/comparisons', label: 'Comparisons' },
    { href: '/tutorials', label: 'Tutorials' },
    ...(categories.some((c) => c.name === 'Best Of') ? [{ href: '/best', label: 'Best Of' }] : []),
    { href: '/topics', label: 'Topics' },
    { href: '/recommendations', label: 'Store' },
    { href: '/about', label: 'About' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200 dark:bg-dark-bg/85 dark:border-dark-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-heading font-bold text-sm">AI</span>
            </div>
            <div>
              <div className="font-heading font-bold text-lg leading-tight group-hover:text-brand-600 transition">{siteConfig.name}</div>
              <div className="text-xs text-slate-500 dark:text-dark-muted leading-tight hidden sm:block">Honest AI reviews since 2024</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-card text-slate-600 dark:text-dark-muted hover:text-slate-900 dark:hover:text-dark-text transition"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link
              href="/search"
              aria-label="Search"
              className="p-2 hover:bg-slate-100 dark:hover:bg-dark-card rounded-lg transition text-slate-500 dark:text-dark-muted"
            >
              <Search className="w-5 h-5" />
            </Link>
            <a
              href="#newsletter"
              className="hidden sm:inline-flex bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
            >
              Subscribe
            </a>
            <MobileNav navLinks={navLinks} />
          </div>
        </div>
      </div>
    </header>
  );
}

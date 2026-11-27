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
    { href: '/about', label: 'About' },
  ];

  const networkLinks = [
    { href: 'https://dream-interpreter-alpha-ruddy.vercel.app', label: 'Dream Interpreter' },
    { href: 'https://ansygroup.com', label: 'Ansy Group' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200 dark:bg-dark-bg/90 dark:border-dark-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 bg-slate-900 dark:bg-white rounded-md flex items-center justify-center">
              <span className="text-white dark:text-slate-900 font-heading font-bold text-sm">AI</span>
            </div>
            <div>
              <div className="font-heading font-bold text-lg leading-tight tracking-tight">{siteConfig.name}</div>
              <div className="text-xs text-slate-500 dark:text-dark-muted leading-tight hidden sm:block">Honest AI reviews since 2024</div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap px-2 xl:px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-card text-slate-600 dark:text-dark-muted hover:text-slate-900 dark:hover:text-dark-text transition"
              >
                {link.label}
              </Link>
            ))}
            <span className="hidden 2xl:inline mx-1 text-slate-300 dark:text-dark-border">|</span>
            <span className="hidden 2xl:contents">
            {networkLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="whitespace-nowrap px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-card text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition font-semibold"
              >
                {link.label}
              </a>
            ))}
            </span>
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
              href="/#newsletter"
              className="hidden xl:inline-flex bg-slate-900 hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
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

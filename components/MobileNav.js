'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, Menu } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function MobileNav({ navLinks }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-dark-card rounded-lg transition"
      >
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white dark:bg-dark-bg shadow-2xl animate-slide-down">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-dark-border">
              <span className="font-heading font-bold">Menu</span>
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-2 hover:bg-slate-100 dark:hover:bg-dark-card rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-4 space-y-1">
              {[{ href: '/', label: 'Home' }, ...navLinks].map((link) => {
                const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`block px-4 py-3 rounded-lg text-sm font-medium transition ${
                      active
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-dark-text dark:hover:bg-dark-card'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between border-t border-slate-200 dark:border-dark-border pt-4 px-2">
              <ThemeToggle />
              <Link
                href="#newsletter"
                className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                Subscribe
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

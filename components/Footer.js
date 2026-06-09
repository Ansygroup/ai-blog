import Link from 'next/link';
import { siteConfig } from '../lib/config';
import { MessageCircle, Globe, Play, Mail } from 'lucide-react';

const socialLinks = [
  { href: siteConfig.social.twitter, icon: MessageCircle, label: 'Twitter' },
  { href: siteConfig.social.linkedin, icon: Globe, label: 'LinkedIn' },
  { href: siteConfig.social.youtube, icon: Play, label: 'YouTube' },
  { href: `mailto:${siteConfig.email}`, icon: Mail, label: 'Email' },
];

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-heading font-bold text-sm">AI</span>
            </div>
            <span className="text-white font-heading font-bold text-lg">{siteConfig.name}</span>
          </div>
          <p className="text-sm text-slate-400 mb-4 max-w-md">{siteConfig.tagline}.</p>
          <div className="flex items-center gap-3 mb-4">
            {socialLinks.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="p-2 bg-slate-800 hover:bg-brand-600 rounded-lg transition text-slate-400 hover:text-white"
              >
                <s.icon className="w-4 h-4" />
              </a>
            ))}
          </div>
          <p className="text-xs text-slate-500 max-w-md">
            <strong>Disclosure:</strong> Some links on this site are affiliate links. We earn a commission if you click them and make a purchase — at no extra cost to you.
            We only recommend products we've personally tested.
          </p>
        </div>
        <div>
          <h4 className="text-white font-heading font-semibold mb-3">Explore</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/reviews" className="hover:text-white transition">All Reviews</Link></li>
            <li><Link href="/comparisons" className="hover:text-white transition">Comparisons</Link></li>
            <li><Link href="/tutorials" className="hover:text-white transition">Tutorials</Link></li>
            <li><Link href="/topics" className="hover:text-white transition">Topics</Link></li>
            <li><Link href="/best" className="hover:text-white transition">Best Of Lists</Link></li>
            <li><Link href="/recommendations" className="hover:text-white transition">Tech Store</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-heading font-semibold mb-3">Latest</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/news" className="hover:text-white transition">AI News</Link></li>
            <li><Link href="/tags" className="hover:text-white transition">Tags</Link></li>
            <li><Link href="/sitemap.xml" className="hover:text-white transition">Sitemap</Link></li>
            <li><Link href="/rss.xml" className="hover:text-white transition">RSS Feed</Link></li>
            <li><Link href="/feed.json" className="hover:text-white transition">JSON Feed</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-heading font-semibold mb-3">Company</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/about" className="hover:text-white transition">About</Link></li>
            <li><Link href="/contact" className="hover:text-white transition">Contact</Link></li>
            <li><Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-white transition">Terms</Link></li>
            <li><Link href="/disclosure" className="hover:text-white transition">Affiliate Disclosure</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
      </div>
    </footer>
  );
}

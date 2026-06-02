import Link from 'next/link';
import { siteConfig } from '../lib/config';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2">
          <div className="text-white text-xl font-bold mb-2">🤖 {siteConfig.name}</div>
          <p className="text-sm text-slate-400 mb-4 max-w-md">{siteConfig.tagline}.</p>
          <p className="text-xs text-slate-500 max-w-md">
            <strong>Disclosure:</strong> Some links on this site are affiliate links. We earn a commission if you click them and make a purchase — at no extra cost to you.
            We only recommend products we've personally tested.
          </p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Explore</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/reviews" className="hover:text-white">All Reviews</Link></li>
            <li><Link href="/comparisons" className="hover:text-white">Comparisons</Link></li>
            <li><Link href="/tutorials" className="hover:text-white">Tutorials</Link></li>
            <li><Link href="/best" className="hover:text-white">Best Of Lists</Link></li>
            <li><Link href="/rss.xml" className="hover:text-white">RSS Feed</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Company</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/about" className="hover:text-white">About</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
            <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-white">Terms</Link></li>
            <li><Link href="/disclosure" className="hover:text-white">Affiliate Disclosure</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
      </div>
    </footer>
  );
}

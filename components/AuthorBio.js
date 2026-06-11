import Link from 'next/link';
import { siteConfig } from '../lib/config';

export default function AuthorBio({ author }) {
  const name = author || siteConfig.author;
  return (
    <div className="mt-10 p-6 bg-slate-50 dark:bg-dark-card rounded-xl border border-slate-200 dark:border-dark-border flex items-start gap-4">
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shrink-0">
        {name[0]}
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-slate-900 dark:text-dark-text">{name}</div>
        <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">
          {siteConfig.name} is an independent publication that publishes expert reviews, comparisons, and tutorials about consumer and professional AI tools. Content is fact-checked, updated quarterly, and written for practitioners.
        </p>
        <div className="flex gap-3 mt-3">
          {siteConfig.social?.twitter && (
            <Link href={siteConfig.social.twitter} target="_blank" aria-label="Twitter" className="text-xs text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition">
              Twitter
            </Link>
          )}
          {siteConfig.social?.linkedin && (
            <Link href={siteConfig.social.linkedin} target="_blank" aria-label="LinkedIn" className="text-xs text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition">
              LinkedIn
            </Link>
          )}
          {siteConfig.social?.youtube && (
            <Link href={siteConfig.social.youtube} target="_blank" aria-label="YouTube" className="text-xs text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition">
              YouTube
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
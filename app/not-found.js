import Link from 'next/link';

export const metadata = { title: '404 — Page Not Found' };

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <h1 className="text-8xl font-extrabold text-slate-200 mb-4">404</h1>
        <h2 className="text-2xl font-bold mb-3">Page Not Found</h2>
        <p className="text-slate-600 mb-8">This page doesn't exist or has been moved. Try searching or browse our latest AI tool reviews.</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/" className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-2.5 rounded-lg transition">Home</Link>
          <Link href="/reviews" className="bg-white border border-slate-300 hover:border-blue-500 font-semibold px-5 py-2.5 rounded-lg transition">All Reviews</Link>
          <Link href="/search" className="bg-white border border-slate-300 hover:border-blue-500 font-semibold px-5 py-2.5 rounded-lg transition">Search</Link>
        </div>
      </div>
    </div>
  );
}

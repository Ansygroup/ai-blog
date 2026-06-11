import Link from 'next/link';

export default function PaginationNav({ currentPage, totalPages, basePath }) {
  if (totalPages <= 1) return null;

  const prevHref = currentPage <= 2 ? basePath : `${basePath}/page/${currentPage - 1}`;
  const nextHref = `${basePath}/page/${currentPage + 1}`;

  return (
    <div className="flex justify-center items-center gap-4 mt-12">
      {currentPage > 1 && (
        <Link
          href={prevHref}
          className="inline-flex items-center gap-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 font-semibold px-5 py-2.5 rounded-lg transition text-sm"
        >
          ← Previous page
        </Link>
      )}
      <span className="text-slate-500 text-sm">Page {currentPage} of {totalPages}</span>
      {currentPage < totalPages && (
        <Link
          href={nextHref}
          className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-2.5 rounded-lg transition text-sm"
        >
          Next page →
        </Link>
      )}
    </div>
  );
}
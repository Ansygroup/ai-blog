export default function AdminLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg p-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-slate-200 dark:border-dark-border border-t-blue-600 mx-auto mb-4" />
        <p className="text-sm text-slate-500 dark:text-dark-muted">Loading...</p>
      </div>
    </div>
  );
}

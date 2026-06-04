export default function AmazonDisclosure({ featured = false }) {
  if (featured) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-5 mb-8">
        <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">🛒 Amazon Affiliate Disclosure</p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
          As an Amazon Associate we earn from qualifying purchases. When you click our links and make a purchase, we may earn a commission at no extra cost to you. Prices are accurate as of publication.
        </p>
      </div>
    );
  }
  return (
    <div className="text-xs text-slate-400 dark:text-dark-muted text-center mt-8 border-t border-slate-200 dark:border-dark-border pt-4">
      As an Amazon Associate we earn from qualifying purchases. Prices and availability are subject to change.
    </div>
  );
}

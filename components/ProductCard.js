import Link from 'next/link';

const TAG = 'ansy07-20';

export default function ProductCard({ product }) {
  if (!product?.slug || !product?.asin) return null;
  const amazonUrl = `https://www.amazon.com/dp/${product.asin}?tag=${TAG}`;
  return (
    <article className="group bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-dark-border overflow-hidden hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition flex flex-col">
      <Link href={`/recommendations/products/${product.slug}`}>
        <div className="aspect-square bg-slate-50 dark:bg-dark-bg flex items-center justify-center p-4 overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            width="300"
            height="300"
            className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
          />
        </div>
      </Link>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center gap-1 text-amber-500 text-sm mb-1">
          {'★'.repeat(Math.round(product.rating || 0))}{'☆'.repeat(5 - Math.round(product.rating || 0))}
          <span className="text-xs text-slate-400 ml-1">({product.reviewsCount?.toLocaleString() || 'N/A'})</span>
        </div>
        <Link href={`/recommendations/products/${product.slug}`}>
          <h3 className="font-semibold text-slate-900 dark:text-dark-text text-sm leading-snug mb-1 line-clamp-2 hover:text-blue-600 transition">{product.name}</h3>
        </Link>
        <div className="text-lg font-bold text-slate-900 dark:text-dark-text mb-2">${product.price}</div>
        <p className="text-xs text-slate-500 dark:text-dark-muted mb-3 line-clamp-2 flex-1">{product.description}</p>
        <a
          href={amazonUrl}
          target="_blank"
          rel="noopener sponsored"
          className="inline-block w-full text-center bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold py-2.5 px-4 rounded-lg transition text-sm"
        >
          Buy on Amazon →
        </a>
      </div>
    </article>
  );
}

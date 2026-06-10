import Link from 'next/link';
import Image from 'next/image';
import Card from './ui/Card';
import { Star, ShoppingCart } from 'lucide-react';
import { formatPrice } from '../lib/formatPrice';

const TAG = 'ansy07-20';

export default function ProductCard({ product }) {
  if (!product?.slug || !product?.asin) return null;
  const amazonUrl = `https://www.amazon.com/dp/${product.asin}?tag=${TAG}`;
  const rating = Math.round(product.rating || 0);
  return (
    <Card className="group h-full flex flex-col" as="article">
      <Link href={`/recommendations/products/${product.slug}`} className="block aspect-square bg-slate-50 dark:bg-dark-bg relative overflow-hidden">
        <Image src={product.image} alt={product.name} fill className="object-contain p-4 group-hover:scale-105 transition duration-500" sizes="(max-width: 640px) 50vw, 25vw" />
      </Link>
      <div className="p-4 flex-1 flex flex-col">
        {product.rating && (
          <div className="flex items-center gap-1 text-amber-500 text-sm mb-1" aria-label={`${product.rating} out of 5 stars`}>
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} className={`w-3.5 h-3.5 ${i < rating ? 'fill-current' : 'opacity-30'}`} />
            ))}
            <span className="text-xs text-slate-400 ml-1">({product.reviewsCount?.toLocaleString() || 'N/A'})</span>
          </div>
        )}
        <Link href={`/recommendations/products/${product.slug}`}>
          <h3 className="font-heading font-semibold text-slate-900 dark:text-dark-text text-sm leading-snug mb-1 line-clamp-2 hover:text-brand-600 dark:hover:text-brand-400 transition">{product.name}</h3>
        </Link>
        <div className="text-lg font-bold text-slate-900 dark:text-dark-text mb-2">{formatPrice(product.price)}</div>
        <p className="text-xs text-slate-500 dark:text-dark-muted mb-3 line-clamp-2 flex-1">{product.description}</p>
        <a
          href={amazonUrl}
          target="_blank"
          rel="noopener sponsored"
          className="inline-flex items-center justify-center gap-2 w-full text-center bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold py-2.5 px-4 rounded-lg transition text-sm"
        >
          <ShoppingCart className="w-4 h-4" />
          Buy on Amazon
        </a>
      </div>
    </Card>
  );
}

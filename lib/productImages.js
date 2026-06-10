const FALLBACKS = {
  laptops: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&q=80',
  headphones: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80',
  monitors: 'https://images.unsplash.com/photo-1527443222154-e9dc8e8b8160?w=400&q=80',
  'ai-books': 'https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?w=400&q=80',
  webcams: 'https://images.unsplash.com/photo-1622173364840-84d9d1c1e0b0?w=400&q=80',
  tablets: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&q=80',
  'smart-home': 'https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=400&q=80',
  storage: 'https://images.unsplash.com/photo-1531496730074-ded06f448eec?w=400&q=80',
  keyboards: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&q=80',
  'office-chairs': 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=400&q=80',
};

const DEFAULT = 'https://images.unsplash.com/photo-1661956602116-aa6865609028?w=400&q=80';

export function getProductImage(product) {
  if (product.image) return product.image;
  return FALLBACKS[product.categorySlug] || DEFAULT;
}

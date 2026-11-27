const FALLBACKS = {
  laptops: '/images/products/laptops.jpg',
  headphones: '/images/products/headphones.jpg',
  monitors: '/images/products/monitors.jpg',
  'ai-books': '/images/products/ai-books.jpg',
  webcams: '/images/products/webcams.jpg',
  tablets: '/images/products/tablets.jpg',
  'smart-home': '/images/products/smart-home.jpg',
  storage: '/images/products/storage.jpg',
  keyboards: '/images/products/keyboards.jpg',
  'office-chairs': '/images/products/office-chairs.jpg',
};

const DEFAULT = '/images/products/default.jpg';

export function getProductImage(product) {
  if (product.image) return product.image;
  return FALLBACKS[product.categorySlug] || DEFAULT;
}
